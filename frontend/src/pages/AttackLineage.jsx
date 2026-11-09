import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceY,
  forceX,
  forceRadial,
} from 'd3-force'
import {
  GitBranch, ZoomIn, ZoomOut, Maximize2, Play, Pause,
  RotateCcw, Copy, Check, Sparkles, Filter, ChevronRight,
  Shield, Crosshair, Zap, Compass, Layers, Radio, ShieldAlert,
  ArrowRight
} from 'lucide-react'
import { getAttackGraph } from '../services/api'

const TYPE_COLORS = {
  prompt_injection: '#ef4444',
  jailbreak: '#f97316',
  adversarial_perturbation: '#eab308',
  data_poisoning: '#a855f7',
  model_extraction: '#3b82f6',
  membership_inference: '#06b6d4',
}

const TYPE_LABELS = {
  prompt_injection: 'Prompt Injection',
  jailbreak: 'Jailbreak',
  adversarial_perturbation: 'Adversarial Perturbation',
  data_poisoning: 'Data Poisoning',
  model_extraction: 'Model Extraction',
  membership_inference: 'Membership Inference',
}

export default function AttackLineage() {
  const navigate = useNavigate()
  const [rawGraphData, setRawGraphData] = useState({ nodes: [], edges: [] })
  const [simNodes, setSimNodes] = useState([])
  const [simLinks, setSimLinks] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [filterType, setFilterType] = useState('ALL')
  const [layoutMode, setLayoutMode] = useState('cascade') // 'cascade' | 'constellation' | 'zerog'
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true)

  // Canvas Pan & Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(0.9)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })

  // Cursor Tracking for Visual Hologram & Physical Tether
  const [cursorPos, setCursorPos] = useState(null)
  const [nearCursorNodeIds, setNearCursorNodeIds] = useState([])

  const containerRef = useRef(null)
  const simulationRef = useRef(null)
  const mouseCanvasPosRef = useRef(null)
  const draggedNodeRef = useRef(null)
  const nodesRef = useRef([])
  const linksRef = useRef([])

  // Fetch attack lineage graph from backend
  useEffect(() => {
    getAttackGraph()
      .then(res => {
        const data = res.data || { nodes: [], edges: [] }
        setRawGraphData(data)
      })
      .catch(() => {})
  }, [])

  // Initialize and Configure D3 Force Simulation
  useEffect(() => {
    if (!rawGraphData.nodes || rawGraphData.nodes.length === 0) return

    const width = containerRef.current ? containerRef.current.clientWidth : 1100
    const height = 650
    const cx = width / 2
    const cy = height / 2

    // Clone nodes for physics simulation (preserving current positions if switching layout)
    const existingNodeMap = new Map((nodesRef.current || []).map(n => [n.id, n]))
    const nodes = rawGraphData.nodes.map((n, i) => {
      const gen = n.generation || 0
      const existing = existingNodeMap.get(n.id)
      return {
        ...n,
        x: existing ? existing.x : cx + (Math.random() - 0.5) * 500,
        y: existing ? existing.y : gen * 150 + 90 + (Math.random() - 0.5) * 30,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
        radius: gen === 0 ? 28 : 22,
      }
    })
    nodesRef.current = nodes

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const links = rawGraphData.edges
      .map(e => ({
        source: nodeMap.get(e.source),
        target: nodeMap.get(e.target),
        rawSource: e.source,
        rawTarget: e.target,
      }))
      .filter(l => l.source && l.target)
    linksRef.current = links

    // Dynamic Cursor Repulsion Force
    const cursorForce = (alpha) => {
      const mouse = mouseCanvasPosRef.current
      if (!mouse) return
      const radius = 170
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const dx = node.x - mouse.x
        const dy = node.y - mouse.y
        const dist = Math.hypot(dx, dy)
        if (dist < radius && dist > 1) {
          const ratio = (radius - dist) / radius
          const force = Math.pow(ratio, 1.4) * 45 * Math.max(alpha, 0.45)
          node.vx += (dx / dist) * force
          node.vy += (dy / dist) * force
        }
      }
    }

    const sim = forceSimulation(nodes)
      .force(
        'link',
        forceLink(links)
          .id(d => d.id)
          .distance(layoutMode === 'constellation' ? 95 : 125)
          .strength(0.65)
      )
      .force('charge', forceManyBody().strength(-300).distanceMax(700))
      .force('collide', forceCollide().radius(d => d.radius + 18).iterations(2))
      .force('cursor', cursorForce)
      .alphaDecay(0.012)
      .velocityDecay(0.32)

    // Apply Layout-Specific Positioning Forces
    if (layoutMode === 'cascade') {
      sim.force('y', forceY(d => (d.generation || 0) * 160 + 95).strength(0.38))
      sim.force('x', forceX(cx).strength(0.05))
    } else if (layoutMode === 'constellation') {
      sim.force('radial', forceRadial(d => (d.generation || 0) * 135 + 70, cx, cy).strength(0.42))
      sim.force('x', forceX(cx).strength(0.08))
      sim.force('y', forceY(cy).strength(0.08))
    } else {
      // Zero-G Free Orbit
      sim.force('x', forceX(cx).strength(0.03))
      sim.force('y', forceY(cy).strength(0.03))
    }

    // Gentle continuous zero-g breathing target & reheat simulation
    sim.alpha(0.85)
    sim.alphaTarget(0.015)
    sim.restart()

    sim.on('tick', () => {
      setSimNodes([...nodes])
      setSimLinks([...links])
    })

    const isFirstRun = !simulationRef.current
    simulationRef.current = sim

    // Initial View Center (only on first graph load)
    if (isFirstRun) {
      setPan({ x: width / 2 - cx * 0.9, y: 35 })
      setZoom(0.9)
    }

    return () => {
      sim.stop()
    }
  }, [rawGraphData, layoutMode])

  // Toggle Physics State
  const togglePhysics = () => {
    if (!simulationRef.current) return
    if (isPhysicsRunning) {
      simulationRef.current.alphaTarget(0).stop()
      setIsPhysicsRunning(false)
    } else {
      simulationRef.current.alpha(0.35).alphaTarget(0.015).restart()
      setIsPhysicsRunning(true)
    }
  }

  // Shockwave Pulse: Send explosive radial kinetic wave from canvas center
  const triggerShockwave = () => {
    if (!simulationRef.current || !nodesRef.current.length) return
    const width = containerRef.current ? containerRef.current.clientWidth : 1100
    const cx = width / 2
    const cy = 325

    nodesRef.current.forEach(node => {
      const dx = node.x - cx
      const dy = node.y - cy
      const dist = Math.hypot(dx, dy) || 1
      const force = 55
      node.vx += (dx / dist) * force
      node.vy += (dy / dist) * force
    })

    simulationRef.current.alpha(0.65).restart()
    if (!isPhysicsRunning) setIsPhysicsRunning(true)
  }

  // Reset Canvas View
  const resetView = () => {
    const width = containerRef.current ? containerRef.current.clientWidth : 1100
    setPan({ x: width / 2 - (width / 2) * 0.9, y: 35 })
    setZoom(0.9)
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart()
    }
  }

  // Compute Active Lineage (Ancestors + Descendants) of hovered/selected node
  const activeLineage = useMemo(() => {
    const focus = hoveredNode || selectedNode
    if (!focus) return null

    const nodeIds = new Set([focus.id])
    const edgeKeys = new Set()

    // Upward traversal: Ancestors
    const findAncestors = (currId) => {
      rawGraphData.edges.forEach(e => {
        if (e.target === currId) {
          nodeIds.add(e.source)
          edgeKeys.add(`${e.source}->${e.target}`)
          findAncestors(e.source)
        }
      })
    }

    // Downward traversal: Descendants
    const findDescendants = (currId) => {
      rawGraphData.edges.forEach(e => {
        if (e.source === currId) {
          nodeIds.add(e.target)
          edgeKeys.add(`${e.source}->${e.target}`)
          findDescendants(e.target)
        }
      })
    }

    findAncestors(focus.id)
    findDescendants(focus.id)

    return { nodeIds, edgeKeys }
  }, [hoveredNode, selectedNode, rawGraphData.edges])

  // Direct Parents & Children of Selected Node for Inspector
  const nodeConnections = useMemo(() => {
    if (!selectedNode) return { parents: [], children: [] }
    const parentIds = rawGraphData.edges
      .filter(e => e.target === selectedNode.id)
      .map(e => e.source)
    const childIds = rawGraphData.edges
      .filter(e => e.source === selectedNode.id)
      .map(e => e.target)

    const parents = simNodes.filter(n => parentIds.includes(n.id))
    const children = simNodes.filter(n => childIds.includes(n.id))
    return { parents, children }
  }, [selectedNode, rawGraphData.edges, simNodes])

  const threatCounts = useMemo(() => {
    const counts = {}
    simNodes.forEach(n => {
      counts[n.attack_type] = (counts[n.attack_type] || 0) + 1
    })
    return counts
  }, [simNodes])

  // Mouse Wheel Zoom
  const handleWheel = (e) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.09 : 0.91
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.35), 2.8))
  }

  // Pan Canvas Mouse Handlers
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.id === 'canvas-bg' || e.target.id === 'canvas-overlay') {
      setIsPanning(true)
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }
  }

  const handleMouseMove = (e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = (e.clientX - rect.left - pan.x) / zoom
      const mouseY = (e.clientY - rect.top - pan.y) / zoom
      mouseCanvasPosRef.current = { x: mouseX, y: mouseY }
      setCursorPos({ x: mouseX, y: mouseY })

      // Detect nodes in vicinity for laser tether highlights
      const nearIds = []
      const radius = 160
      simNodes.forEach(n => {
        const d = Math.hypot(n.x - mouseX, n.y - mouseY)
        if (d < radius) nearIds.push(n.id)
      })
      setNearCursorNodeIds(nearIds)

      // Gently stir simulation while moving cursor near nodes
      if (simulationRef.current && isPhysicsRunning) {
        if (nearIds.length > 0 && simulationRef.current.alpha() < 0.12) {
          simulationRef.current.alpha(0.12).restart()
        }
      }
    }

    // Dragging canvas
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      })
    }

    // Dragging specific node
    if (draggedNodeRef.current) {
      const mouse = mouseCanvasPosRef.current
      if (mouse) {
        draggedNodeRef.current.fx = mouse.x
        draggedNodeRef.current.fy = mouse.y
        if (simulationRef.current) {
          simulationRef.current.alphaTarget(0.35).restart()
        }
      }
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null
      draggedNodeRef.current.fy = null
      draggedNodeRef.current = null
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0.015)
      }
    }
  }

  const handleMouseLeave = () => {
    setIsPanning(false)
    mouseCanvasPosRef.current = null
    setCursorPos(null)
    setNearCursorNodeIds([])
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null
      draggedNodeRef.current.fy = null
      draggedNodeRef.current = null
    }
  }

  // Node Dragging Start
  const startDragNode = (e, node) => {
    e.stopPropagation()
    draggedNodeRef.current = node
    node.fx = node.x
    node.fy = node.y
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0.35).restart()
    }
    setSelectedNode(node)
  }

  // Copy Payload
  const copyPayload = () => {
    if (!selectedNode?.payload) return
    navigator.clipboard.writeText(selectedNode.payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  // Send to Defense Monitor
  const testInDefenseMonitor = () => {
    if (!selectedNode?.payload) return
    navigate('/defense', { state: { prompt: selectedNode.payload } })
  }

  // Center on a specific node
  const centerOnNode = (node) => {
    if (!node || !containerRef.current) return
    const width = containerRef.current.clientWidth
    const height = 650
    setPan({
      x: width / 2 - node.x * zoom,
      y: height / 2 - node.y * zoom,
    })
    setSelectedNode(node)
  }

  // Filtered Nodes check
  const isNodeVisible = (node) => {
    if (filterType === 'ALL') return true
    return node.attack_type === filterType
  }

  return (
    <div>
      {/* Top Header & Quick Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Attack Mutation Lineage
            </h2>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-green-500/10 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
              <Sparkles size={11} /> Zero-G Physics Graph
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Zero-G force simulation: Sweep cursor to repel vectors, drag elastic springs, or click nodes to inspect mutations.
          </p>
        </div>

        {/* Global Controls HUD */}
        <div className="flex items-center gap-2 cyber-panel rounded-xl p-1.5 text-xs">
          <span className="font-mono text-green-400 px-2 font-semibold">
            {simNodes.length} Nodes • {simLinks.length} Mutations
          </span>

          <div className="h-4 w-px bg-aegis-border mx-1" />

          {/* Layout Mode Switcher */}
          <div className="flex items-center gap-1 bg-aegis-surface rounded-lg p-0.5 border border-aegis-border">
            <button
              type="button"
              onClick={() => setLayoutMode('cascade')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                layoutMode === 'cascade'
                  ? 'bg-green-500 text-slate-950 font-bold shadow-sm'
                  : 'text-gray-400 hover:text-green-400'
              }`}
              title="Generational Cascade (G0 on top down to G3)"
            >
              Cascade
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('constellation')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                layoutMode === 'constellation'
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-purple-400'
              }`}
              title="Radial Constellation (Seeds at center orbiting outwards)"
            >
              Radial
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('zerog')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                layoutMode === 'zerog'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-emerald-400'
              }`}
              title="Free Zero-G Orbit"
            >
              Zero-G
            </button>
          </div>

          <div className="h-4 w-px bg-aegis-border mx-1" />

          {/* Shockwave Blast */}
          <button
            onClick={triggerShockwave}
            title="Trigger Kinetic Shockwave (Explode & Rebound)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all font-mono active:scale-95 cursor-pointer"
          >
            <Zap size={13} className="text-amber-400" />
            <span>Pulse</span>
          </button>

          {/* Play / Pause Physics */}
          <button
            onClick={togglePhysics}
            title={isPhysicsRunning ? "Freeze Simulation" : "Resume Zero-G Float"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-mono active:scale-95 cursor-pointer ${
              isPhysicsRunning
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
            }`}
          >
            {isPhysicsRunning ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPhysicsRunning ? 'Floating' : 'Frozen'}</span>
          </button>

          <button
            onClick={() => setZoom(z => Math.min(z * 1.18, 2.8))}
            className="p-1.5 hover:text-cyan-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z * 0.82, 0.35))}
            className="p-1.5 hover:text-cyan-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 hover:text-cyan-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Center Graph"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Main Grid: Visualizer + Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Canvas Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          className="lg:col-span-3 relative h-[680px] bg-slate-950 border border-aegis-border rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none shadow-2xl"
        >
          {/* Subtle Cyber Grid Background */}
          <div
            id="canvas-bg"
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #22c55e 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* Floating Instructions Pill */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-gray-300 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
            <span>Move cursor to repel & tether • Drag nodes to stretch • Scroll to zoom</span>
          </div>

          {/* Threat Filter Bar */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-1 text-[11px] shadow-xl">
            <span className="text-gray-300 px-1 font-mono flex items-center gap-1">
              <Filter size={11} /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                filterType === 'ALL' ? 'bg-green-400 text-slate-950 font-bold shadow-sm' : 'text-gray-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              All
            </button>
            {Object.keys(TYPE_COLORS).slice(0, 3).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  filterType === type ? 'bg-white text-slate-950 font-bold shadow-sm' : 'text-gray-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Generational Legend Watermark */}
          <div className="absolute left-4 bottom-4 pointer-events-none flex flex-col gap-1 text-[11px] font-mono text-gray-500 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 backdrop-blur">
            <div className="text-gray-400 font-bold mb-0.5">Lineage Depth Hierarchy</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>G0: Seed Root Attacks (AdvBench/Jailbreak)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>G1: Single-Strategy Mutations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>G2-G3: Deep Multi-Stage Obfuscations</span>
            </div>
          </div>

          {/* SVG Force Graph */}
          {simNodes.length > 0 ? (
            <svg
              width="100%"
              height="100%"
              className="w-full h-full"
            >
              <defs>
                {/* Glow Filter */}
                <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="subtle-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* Arrowhead markers */}
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="25"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Transformable Canvas Group */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* 1. EDGES / MUTATION CONNECTIONS */}
                {simLinks.map((link, i) => {
                  const edgeKey = `${link.rawSource}->${link.rawTarget}`
                  const isActive = activeLineage?.edgeKeys.has(edgeKey)
                  const isDimmed = activeLineage && !isActive

                  return (
                    <g key={`edge-${i}`}>
                      {/* Background Glow Line if Active Lineage */}
                      {isActive && (
                        <line
                          x1={link.source.x}
                          y1={link.source.y}
                          x2={link.target.x}
                          y2={link.target.y}
                          stroke="#38bdf8"
                          strokeWidth={6}
                          strokeOpacity={0.45}
                          filter="url(#neon-glow)"
                        />
                      )}
                      {/* Main Connection Line */}
                      <line
                        x1={link.source.x}
                        y1={link.source.y}
                        x2={link.target.x}
                        y2={link.target.y}
                        stroke={isActive ? '#38bdf8' : isDimmed ? '#1e293b' : '#334155'}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        strokeDasharray={isActive ? '6,3' : '3,3'}
                        strokeOpacity={isDimmed ? 0.2 : 0.8}
                        markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
                      />
                      {/* Moving energy pulse along highlighted mutation edge */}
                      {isActive && (
                        <circle
                          r={3.5}
                          fill="#38bdf8"
                          filter="url(#subtle-glow)"
                        >
                          <animateMotion
                            path={`M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`}
                            dur="1.5s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                    </g>
                  )
                })}

                {/* 2. DYNAMIC CURSOR LASER TETHERS (Gravitational Probes) */}
                {cursorPos && nearCursorNodeIds.map(nodeId => {
                  const target = simNodes.find(n => n.id === nodeId)
                  if (!target) return null
                  return (
                    <g key={`tether-${nodeId}`} className="pointer-events-none">
                      <line
                        x1={cursorPos.x}
                        y1={cursorPos.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="#38bdf8"
                        strokeWidth={1.4}
                        strokeDasharray="3 3"
                        strokeOpacity={0.55}
                        filter="url(#subtle-glow)"
                      />
                      <circle
                        cx={target.x}
                        cy={target.y}
                        r={target.radius + 6}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth={1.2}
                        strokeDasharray="2 2"
                        strokeOpacity={0.6}
                      />
                    </g>
                  )
                })}

                {/* 3. INTERACTIVE CURSOR HOLOGRAM RETICLE */}
                {cursorPos && (
                  <g
                    transform={`translate(${cursorPos.x}, ${cursorPos.y})`}
                    className="pointer-events-none"
                  >
                    <circle
                      r={24}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={1.2}
                      strokeDasharray="4 4"
                      strokeOpacity={0.7}
                    />
                    <circle
                      r={3.5}
                      fill="#38bdf8"
                      filter="url(#subtle-glow)"
                    />
                    {/* Reticle tick crosshairs */}
                    <line x1={-30} y1={0} x2={-16} y2={0} stroke="#38bdf8" strokeWidth={1.5} strokeOpacity={0.8} />
                    <line x1={16} y1={0} x2={30} y2={0} stroke="#38bdf8" strokeWidth={1.5} strokeOpacity={0.8} />
                    <line x1={0} y1={-30} x2={0} y2={-16} stroke="#38bdf8" strokeWidth={1.5} strokeOpacity={0.8} />
                    <line x1={0} y1={16} x2={0} y2={30} stroke="#38bdf8" strokeWidth={1.5} strokeOpacity={0.8} />
                  </g>
                )}

                {/* 4. NODES / ATTACK VECTORS */}
                {simNodes.map(node => {
                  const color = TYPE_COLORS[node.attack_type] || '#6b7280'
                  const isSelected = selectedNode?.id === node.id
                  const isHovered = hoveredNode?.id === node.id
                  const isLineageActive = activeLineage?.nodeIds.has(node.id)
                  const isVisible = isNodeVisible(node)
                  const isDimmed = (!isVisible) || (activeLineage && !isLineageActive)

                  const r = node.radius || (node.generation === 0 ? 28 : 22)

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onMouseDown={(e) => startDragNode(e, node)}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer"
                      style={{
                        opacity: isDimmed ? 0.18 : 1,
                        transition: 'opacity 0.25s ease',
                      }}
                    >
                      {/* Outer Glowing Halo for Hovered / Selected */}
                      {(isSelected || isHovered || isLineageActive) && (
                        <circle
                          r={r + 8}
                          fill="none"
                          stroke={isSelected ? '#38bdf8' : color}
                          strokeWidth={2}
                          strokeOpacity={0.65}
                          filter="url(#neon-glow)"
                          strokeDasharray={isSelected ? '4,4' : undefined}
                        />
                      )}

                      {/* Node Body */}
                      <circle
                        r={r}
                        fill="#0f172a"
                        stroke={color}
                        strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.8}
                      />

                      {/* Inner Color Core */}
                      <circle
                        r={r - 4}
                        fill={color}
                        fillOpacity={0.18}
                      />

                      {/* Node Label: Generation Badge */}
                      <text
                        y={-2}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={r > 24 ? 12 : 10}
                        fontWeight="bold"
                        className="pointer-events-none select-none font-mono"
                      >
                        G{node.generation || 0}
                      </text>

                      {/* CVSS Mini Pill */}
                      <text
                        y={r > 24 ? 12 : 9}
                        textAnchor="middle"
                        fill={node.severity >= 8 ? '#ef4444' : node.severity >= 6 ? '#f97316' : '#22c55e'}
                        fontSize={9}
                        fontWeight="bold"
                        className="pointer-events-none select-none font-mono"
                      >
                        {node.severity ? node.severity.toFixed(1) : '—'}
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <GitBranch size={48} className="text-gray-700 mb-3 animate-pulse" />
              <p className="text-gray-400 font-medium">No attack lineage data recorded yet.</p>
              <p className="text-gray-600 text-xs mt-1">Run a scan on the Scan Control page to generate live mutation lineage.</p>
            </div>
          )}
        </div>

        {/* Right Inspector & Node Details */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Active Node Inspector */}
          <div className="cyber-panel border-t-2 border-t-green-400 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-aegis-border/60">
              <div className="flex items-center gap-2">
                <Crosshair size={16} className="text-green-400" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Node Inspector
                </h3>
              </div>
              {selectedNode && (
                <button
                  onClick={() => centerOnNode(selectedNode)}
                  title="Center View on Node"
                  className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
                >
                  <Maximize2 size={12} /> Focus
                </button>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                {/* Generation & Severity Header */}
                <div className="flex items-center justify-between">
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-bold font-mono"
                    style={{
                      background: `${TYPE_COLORS[selectedNode.attack_type]}20`,
                      color: TYPE_COLORS[selectedNode.attack_type],
                      border: `1px solid ${TYPE_COLORS[selectedNode.attack_type]}40`,
                    }}
                  >
                    Generation {selectedNode.generation} ({selectedNode.generation === 0 ? 'Seed Root' : 'Mutated Variant'})
                  </span>

                  <span
                    className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                    style={{
                      color: selectedNode.severity >= 8 ? '#ef4444' : selectedNode.severity >= 6 ? '#f97316' : '#22c55e',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    CVSS {selectedNode.severity?.toFixed(1) || '0.0'}
                  </span>
                </div>

                {/* Threat Type */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    Threat Class
                  </span>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                    {TYPE_LABELS[selectedNode.attack_type] || selectedNode.attack_type}
                  </div>
                </div>

                {/* Node Identifier */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    Node Hash
                  </span>
                  <div className="font-mono text-xs text-green-400 bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1.5 mt-1 select-all break-all">
                    {selectedNode.id}
                  </div>
                </div>

                {/* Attack Payload with Copy Button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      Adversarial Payload
                    </span>
                    <button
                      onClick={copyPayload}
                      className="text-[11px] text-gray-400 hover:text-green-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 max-h-36 overflow-y-auto text-xs font-mono text-gray-200 leading-relaxed break-words shadow-inner">
                    {selectedNode.payload}
                  </div>
                </div>

                {/* Direct Action: Test In Defense Monitor */}
                <button
                  onClick={testInDefenseMonitor}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(34,197,94,0.25)] group cursor-pointer active:scale-95"
                >
                  <Shield size={14} className="group-hover:scale-110 transition-transform" />
                  <span>Test in Defense Monitor</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Direct Lineage Relationships */}
                <div className="pt-2 border-t border-aegis-border/40 space-y-2">
                  <div>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>Parent Seed / Variant:</span>
                    {nodeConnections.parents.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {nodeConnections.parents.map(p => (
                          <button
                            key={p.id}
                            onClick={() => centerOnNode(p)}
                            className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
                          >
                            ← G{p.generation} ({p.id.slice(0, 8)})
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic mt-0.5">None (Root Seed Vector)</div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>Offspring Mutations ({nodeConnections.children.length}):</span>
                    {nodeConnections.children.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1 max-h-24 overflow-y-auto">
                        {nodeConnections.children.map(c => (
                          <button
                            key={c.id}
                            onClick={() => centerOnNode(c)}
                            className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors cursor-pointer"
                          >
                            → G{c.generation} ({c.id.slice(0, 8)})
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic mt-0.5">None (Leaf Mutation)</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-xs">
                <Crosshair size={32} className="mx-auto mb-2 text-green-400/50 animate-pulse" />
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>No vector selected</p>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Hover or click any node in the Zero-G canvas to inspect payload, generation, and mutations.
                </p>
              </div>
            )}
          </div>

          {/* Threat Class Legend Card */}
          <div className="cyber-panel rounded-2xl p-4 text-xs">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider font-mono text-emerald-700 dark:text-green-400">
                Threat Matrix Filter
              </h4>
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                {simNodes.length} Total
              </span>
            </div>
            <div className="space-y-1">
              {Object.entries(TYPE_LABELS).map(([type, label]) => {
                const count = threatCounts[type] || 0;
                const isActive = filterType === type;
                return (
                  <div
                    key={type}
                    onClick={() => setFilterType(filterType === type ? 'ALL' : type)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                      isActive
                        ? 'bg-green-500/15 border border-green-500/40 shadow-sm'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          background: TYPE_COLORS[type],
                          boxShadow: isActive ? `0 0 8px ${TYPE_COLORS[type]}` : 'none'
                        }}
                      />
                      <span className="font-semibold truncate text-slate-800 dark:text-slate-200">
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className="px-2.5 py-0.5 rounded-md font-mono font-black text-xs bg-emerald-100 dark:bg-[#122417] border border-emerald-300 dark:border-green-500/40 text-emerald-950 dark:text-green-300 shadow-xs">
                        {count}
                      </span>
                      {isActive && (
                        <span className="text-emerald-700 dark:text-green-400 font-bold">Active</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
