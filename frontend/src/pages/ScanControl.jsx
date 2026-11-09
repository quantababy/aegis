import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play, Square, Settings, Zap, Loader2, Server, Search,
  Copy, Check, ArrowRight, ShieldAlert, Sparkles, Filter
} from 'lucide-react'
import { startScan, getTargets } from '../services/api'
import { useToast } from '../components/Toast'
import ModelSelector from '../components/ModelSelector'

const ATTACK_TYPES = [
  { value: 'prompt_injection', label: 'Prompt Injection', color: '#ef4444' },
  { value: 'jailbreak', label: 'Jailbreak', color: '#f97316' },
  { value: 'adversarial_perturbation', label: 'Adversarial Perturbation', color: '#eab308' },
  { value: 'data_poisoning', label: 'Data Poisoning', color: '#a855f7' },
  { value: 'model_extraction', label: 'Model Extraction', color: '#3b82f6' },
  { value: 'membership_inference', label: 'Membership Inference', color: '#06b6d4' },
]

const RISK_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' }

const SCAN_PRESETS = [
  { id: 'smoke', label: 'Quick Smoke', attacks: 5, depth: 1, desc: 'Fast validation' },
  { id: 'balanced', label: 'Balanced Audit', attacks: 20, depth: 3, desc: 'Recommended' },
  { id: 'deep', label: 'Exhaustive Red-Team', attacks: 50, depth: 4, desc: 'Deep fuzzing' },
]

export default function ScanControl() {
  const navigate = useNavigate()
  const toast = useToast()

  const [config, setConfig] = useState({
    target: 'mock',
    num_attacks: 20,
    mutation_depth: 3,
    attack_types: [],
  })
  const [activePreset, setActivePreset] = useState('balanced')
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState(null)
  const [progress, setProgress] = useState(0)
  const [targets, setTargets] = useState([
    { id: 'mock', name: 'Mock LLM (Sandboxed)', available: true }
  ])
  const [filterType, setFilterType] = useState('ALL')
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    getTargets()
      .then(res => {
        if (res.data?.targets) {
          setTargets(res.data.targets)
        }
      })
      .catch(() => {})
  }, [])

  const applyPreset = (preset) => {
    setActivePreset(preset.id)
    setConfig(prev => ({
      ...prev,
      num_attacks: preset.attacks,
      mutation_depth: preset.depth,
    }))
    toast(`Preset applied: ${preset.label} (${preset.attacks} attacks)`, 'info')
  }

  const runScan = () => {
    setScanning(true)
    setProgress(0)
    setResults({
      status: 'running',
      total_tested: 0,
      total_vulns: 0,
      vulnerabilities: [],
    })
    toast('Attack generation pipeline initiated', 'info')

    const params = new URLSearchParams({
      target: config.target,
      num_attacks: config.num_attacks.toString(),
      mutation_depth: config.mutation_depth.toString(),
      attack_types: config.attack_types.join(','),
    })

    const es = new EventSource(`/api/scan/stream?${params.toString()}`)

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'start') {
          setProgress(2)
        } else if (data.type === 'tick') {
          setProgress(data.percent || 0)
          setResults((prev) => {
            const nextVulns = data.vuln
              ? [data.vuln, ...(prev?.vulnerabilities || [])]
              : prev?.vulnerabilities || []
            return {
              status: 'running',
              total_tested: data.tested,
              total_vulns: nextVulns.length,
              vulnerabilities: nextVulns,
            }
          })
        } else if (data.type === 'complete') {
          setProgress(100)
          setResults((prev) => ({
            ...prev,
            status: 'completed',
            total_tested: data.total_tested,
            total_vulns: data.total_vulns,
          }))
          es.close()
          setScanning(false)
          toast(`Scan completed: ${data.total_vulns} vulnerabilities found`, 'info')
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err)
      }
    }

    es.onerror = (err) => {
      console.warn('SSE stream closed or error occurred:', err)
      es.close()
      setScanning(false)
      setResults((prev) => {
        if (!prev || prev.vulnerabilities.length === 0) {
          return { error: 'Scan streaming failed. Ensure backend server is running.' }
        }
        return { ...prev, status: 'completed' }
      })
    }
  }

  const toggleAttackType = (type) => {
    setActivePreset(null)
    setConfig(prev => ({
      ...prev,
      attack_types: prev.attack_types.includes(type)
        ? prev.attack_types.filter(t => t !== type)
        : [...prev.attack_types, type],
    }))
  }

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast('Payload copied to clipboard', 'info')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredResults = (results?.vulnerabilities || []).filter(v =>
    filterType === 'ALL' || v.risk_level === filterType
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          Automated Scan Control
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Configure, schedule, and orchestrate automated adversarial LLM red-teaming
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-aegis-panel border border-aegis-border rounded-2xl p-5 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Settings size={16} className="text-aegis-accent" /> Scan Configuration
            </h3>

            {/* Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold font-mono uppercase" style={{ color: 'var(--color-text-muted)' }}>
                  Tactical Audit Profile
                </label>
                <span className="text-[10px] text-green-400 font-mono">3 Presets</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {SCAN_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative group ${
                      activePreset === p.id
                        ? 'bg-gradient-to-b from-green-500/20 via-emerald-500/10 to-transparent border-green-400 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                        : 'border-aegis-border hover:border-green-500/40 hover:bg-aegis-surface text-gray-400'
                    }`}
                  >
                    <p className="text-[11px] font-bold">{p.label}</p>
                    <span className="text-[10px] block opacity-75 font-mono">{p.attacks} tests</span>
                    {p.id === 'balanced' && (
                      <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[8px] font-bold uppercase tracking-wider">
                        Rec
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Target Selector */}
              <div>
                <label className="text-xs font-semibold block mb-1.5 flex items-center justify-between" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Target LLM Endpoint</span>
                  <span className="text-[10px] text-green-400 font-mono">SecOps Target</span>
                </label>
                <ModelSelector
                  targets={targets}
                  selectedId={config.target}
                  onSelect={(id) => setConfig((p) => ({ ...p, target: id }))}
                />
              </div>

              {/* Sliders */}
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Payload Volume</span>
                  <span className="font-mono text-aegis-accent">{config.num_attacks} attacks</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={config.num_attacks}
                  onChange={e => {
                    setActivePreset(null)
                    setConfig(p => ({ ...p, num_attacks: parseInt(e.target.value) }))
                  }}
                  className="w-full accent-aegis-accent cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Mutation Depth (Chains)</span>
                  <span className="font-mono text-aegis-accent">Level {config.mutation_depth}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={config.mutation_depth}
                  onChange={e => {
                    setActivePreset(null)
                    setConfig(p => ({ ...p, mutation_depth: parseInt(e.target.value) }))
                  }}
                  className="w-full accent-aegis-accent cursor-pointer"
                />
              </div>

              {/* Attack Types Multiselect */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Attack Categories {config.attack_types.length > 0 ? `(${config.attack_types.length})` : '(All)'}
                  </label>
                  {config.attack_types.length > 0 && (
                    <button
                      onClick={() => setConfig(p => ({ ...p, attack_types: [] }))}
                      className="text-[10px] text-aegis-accent hover:underline cursor-pointer"
                    >
                      Reset to All
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ATTACK_TYPES.map(({ value, label, color }) => {
                    const isSelected = config.attack_types.includes(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleAttackType(value)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-current font-bold shadow-sm'
                            : 'border-aegis-border opacity-60 hover:opacity-100 hover:bg-aegis-surface'
                        }`}
                        style={{
                          color: isSelected ? color : 'var(--color-text-muted)',
                          backgroundColor: isSelected ? `${color}15` : 'transparent',
                          borderColor: isSelected ? color : 'var(--color-border)',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={runScan}
              disabled={scanning}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-emerald-500 hover:to-teal-500 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {scanning ? (
                <>
                  <Loader2 size={16} className="animate-spin text-green-200" />
                  <span className="tracking-wide">Synthesizing Attack Vectors...</span>
                </>
              ) : (
                <>
                  <Zap size={16} className="text-green-200" />
                  <span className="tracking-wide">Launch Red-Team Campaign</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Animated Active Progress Header */}
          {scanning && (
            <div className="bg-aegis-panel border border-aegis-border rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <span className="w-2.5 h-2.5 rounded-full bg-aegis-accent animate-ping" />
                  Fuzzing Active Target: {config.target}
                </span>
                <span className="font-mono text-aegis-accent">{Math.round(progress)}% Complete</span>
              </div>

              {/* Progress track */}
              <div className="h-2.5 bg-aegis-surface rounded-full overflow-hidden p-0.5 border border-aegis-border">
                <div
                  className="h-full bg-aegis-accent rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.max(progress, 3)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1" style={{ color: 'var(--color-text-muted)' }}>
                <span>Tested: {results?.total_tested || 0} payloads</span>
                <span className="text-red-400 font-bold">Discovered: {results?.total_vulns || 0} vulnerabilities</span>
              </div>
            </div>
          )}

          {/* Scan Results Table */}
          {results && !results.error && (
            <div className="bg-aegis-panel border border-aegis-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <span>Scan Output</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-green-500/15 text-green-400 border border-green-500/30">
                      {results.status}
                    </span>
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {results.total_vulns} vulns discovered across {results.total_tested} tested payloads
                  </p>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5">
                  {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
                    <button
                      key={level}
                      onClick={() => setFilterType(level)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        filterType === level
                          ? 'bg-aegis-accent text-white shadow-sm'
                          : 'border border-aegis-border text-gray-400 hover:bg-aegis-surface'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto pr-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-[11px] font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th className="py-2.5 px-3">Risk</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">CVSS</th>
                      <th className="py-2.5 px-3">Payload Preview</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {filteredResults.map((v, i) => (
                      <tr key={i} className="hover:bg-aegis-surface/60 transition-colors group">
                        <td className="py-2.5 px-3">
                          <span
                            className="px-2 py-0.5 rounded font-bold text-[10px]"
                            style={{ background: `${RISK_COLORS[v.risk_level]}20`, color: RISK_COLORS[v.risk_level] }}
                          >
                            {v.risk_level}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                          {v.attack_type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold" style={{ color: RISK_COLORS[v.risk_level] }}>
                          {v.severity.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs max-w-xs truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {v.payload}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <button
                            onClick={() => handleCopy(v.payload, i)}
                            title="Copy Exploit Payload"
                            className="p-1 rounded hover:bg-aegis-surface text-gray-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedId === i ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                          </button>
                          <button
                            onClick={() => navigate('/defense', { state: { prompt: v.payload } })}
                            title="Test in Live Defense Proxy"
                            className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-semibold border border-blue-500/30 transition-all cursor-pointer"
                          >
                            Test Firewall →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results?.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-400 text-sm flex items-center gap-3">
              <ShieldAlert size={20} />
              <span>{results.error}</span>
            </div>
          )}

          {!scanning && !results && (
            <div className="bg-aegis-panel border border-aegis-border rounded-2xl p-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-aegis-accent/10 flex items-center justify-center mx-auto text-aegis-accent">
                <Zap size={28} />
              </div>
              <h3 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
                Target Ready for Red-Teaming
              </h3>
              <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-muted)' }}>
                Select a preset profile or customize payload count and mutation depth on the left, then launch the scan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
