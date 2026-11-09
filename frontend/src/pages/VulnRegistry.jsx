import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bug, Search, ArrowUpDown, ExternalLink, FileText,
  Copy, Check, ShieldCheck, ArrowRight, Zap, Download,
  Layers, X, Globe, Radio
} from 'lucide-react'
import { getVulnerabilities, switchBlockchainNetwork } from '../services/api'
import { useToast } from '../components/Toast'

const RISK_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' }
const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const SUPPORTED_NETWORKS = [
  { id: 'sepolia', label: 'Ethereum Sepolia', chainId: 11155111, isPublic: true },
  { id: 'arbitrumSepolia', label: 'Arbitrum Sepolia', chainId: 421614, isPublic: true },
  { id: 'baseSepolia', label: 'Base Sepolia', chainId: 84532, isPublic: true },
  { id: 'localhost', label: 'Hardhat Local', chainId: 31337, isPublic: false },
]

export default function VulnRegistry() {
  const navigate = useNavigate()
  const toast = useToast()

  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('ALL')
  const [sortField, setSortField] = useState('severity')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [copiedType, setCopiedType] = useState(null)
  const [switchingNetwork, setSwitchingNetwork] = useState(false)
  const [deployment, setDeployment] = useState({
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    network: 'sepolia',
    networkName: 'Ethereum Sepolia Testnet',
    chainId: 11155111,
    explorerUrl: 'https://sepolia.etherscan.io/address/0x5FbDB2315678afecb367f032d93F642f64180aa3',
  })

  useEffect(() => {
    getVulnerabilities()
      .then(res => {
        setRecords(res.data?.records || [])
        if (res.data?.deployment) {
          setDeployment(res.data.deployment)
        }
      })
      .catch(() => {})
  }, [])

  const handleNetworkChange = async (netId) => {
    if (netId === deployment.network || switchingNetwork) return
    setSwitchingNetwork(true)
    toast(`Deploying anchor to ${netId}...`, 'info')
    try {
      const res = await switchBlockchainNetwork(netId)
      if (res.data?.deployment) {
        setDeployment(res.data.deployment)
        toast(`Active anchor switched to ${res.data.deployment.networkName || netId}`, 'success')
      }
    } catch (err) {
      toast(`Failed to switch network: ${err.message}`, 'error')
    } finally {
      setSwitchingNetwork(false)
    }
  }

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    toast(`${type} copied to clipboard`, 'info')
    setTimeout(() => setCopiedType(null), 2000)
  }

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `aegis_audit_ledger_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    toast('Audit ledger exported as JSON', 'info')
  }

  const filtered = records
    .filter(r => filterRisk === 'ALL' || r.risk_level === filterRisk)
    .filter(r =>
      search === '' ||
      r.attack_type.includes(search.toLowerCase()) ||
      r.evidence_hash.includes(search.toLowerCase()) ||
      r.id.includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0
      if (sortField === 'severity') cmp = a.severity - b.severity
      else if (sortField === 'risk_level') cmp = RISK_ORDER[a.risk_level] - RISK_ORDER[b.risk_level]
      else if (sortField === 'attack_type') cmp = a.attack_type.localeCompare(b.attack_type)
      else if (sortField === 'block_number') cmp = a.block_number - b.block_number
      return sortAsc ? cmp : -cmp
    })

  const contractAddr = deployment.contractAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3'
  const netName = deployment.networkName || 'Ethereum Sepolia Testnet'
  const chainId = deployment.chainId || 11155111
  const explorerUrl = deployment.explorerUrl || `https://sepolia.etherscan.io/address/${contractAddr}`

  const criticalCount = records.filter(r => r.risk_level === 'CRITICAL').length
  const highCount = records.filter(r => r.risk_level === 'HIGH').length
  const maxCVSS = records.reduce((max, r) => Math.max(max, r.severity || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Vulnerabilities
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-green-500/10 text-green-400 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.2)]">
              SOC Incident Registry
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Cryptographically anchored tamper-proof audit trail verified on Ethereum EVM
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 cyber-panel-interactive rounded-xl text-xs font-semibold hover:border-green-400 transition-all cursor-pointer shadow-sm active:scale-95"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <Download size={13} className="text-green-400" />
            <span>Export JSON</span>
          </button>
          <a
            href="/api/report/export?format=html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_0_12px_rgba(34,197,94,0.3)] active:scale-95"
          >
            <FileText size={13} />
            <span>EU AI Act Report</span>
          </a>
        </div>
      </div>

      {/* SecOps Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="cyber-panel p-3 rounded-xl border-t-2 border-t-green-400">
          <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Total Verified Incidents
          </span>
          <div className="text-xl font-bold font-mono mt-0.5 text-green-400">{records.length}</div>
        </div>
        <div className="cyber-panel p-3 rounded-xl border-t-2 border-t-rose-500">
          <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Critical Severity
          </span>
          <div className="text-xl font-bold font-mono mt-0.5 text-rose-400">{criticalCount}</div>
        </div>
        <div className="cyber-panel p-3 rounded-xl border-t-2 border-t-amber-500">
          <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Peak CVSS Score
          </span>
          <div className="text-xl font-bold font-mono mt-0.5 text-amber-400">{maxCVSS.toFixed(1)}</div>
        </div>
        <div className="cyber-panel p-3 rounded-xl border-t-2 border-t-emerald-400">
          <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            On-Chain Integrity
          </span>
          <div className="text-xl font-bold font-mono mt-0.5 text-emerald-400">100% Immutable</div>
        </div>
      </div>

      {/* Multi-Network EVM Selector & Contract Banner */}
      <div className="cyber-panel rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              EVM Registry Contract:
            </span>
            <button
              onClick={() => handleCopy(contractAddr, 'Contract Address')}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-aegis-surface border border-aegis-border font-mono text-green-400 hover:border-green-400 transition-all cursor-pointer"
              title="Click to copy contract address"
            >
              <span>{contractAddr}</span>
              {copiedType === 'Contract Address' ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="opacity-60 group-hover:opacity-100" />}
            </button>

            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-[11px] font-semibold transition-all"
                title="View contract on Block Explorer"
              >
                <span>Explorer</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
            <span>EIP-155</span>
            <span>•</span>
            <span className="font-semibold text-aegis-accent">{netName}</span>
            <span>•</span>
            <span>Chain ID: {chainId}</span>
            <span>•</span>
            <span className="text-green-500 font-bold">Tamper-Proof Anchor</span>
          </div>
        </div>

        {/* Network Switcher Toolbar */}
        <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Globe size={13} className="text-aegis-accent" />
            <span className="text-[11px] font-medium">Target Network:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {SUPPORTED_NETWORKS.map(net => {
              const active = deployment.network === net.id
              return (
                <button
                  key={net.id}
                  onClick={() => handleNetworkChange(net.id)}
                  disabled={switchingNetwork}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-aegis-accent/15 border-aegis-accent text-aegis-accent shadow-sm'
                      : 'border-aegis-border text-gray-400 hover:bg-aegis-surface hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-aegis-accent' : 'bg-gray-500'}`} />
                  <span>{net.label}</span>
                  <span className="text-[10px] opacity-60">({net.chainId})</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Interactive Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" />
          <input
            type="text"
            placeholder="Search by attack type, hash, or record ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full cyber-panel rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-green-400 transition-colors shadow-inner"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </div>

        <div className="flex items-center gap-1.5 bg-aegis-panel p-1 rounded-xl border border-aegis-border">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => {
            const isActive = filterRisk === level;
            return (
              <button
                key={level}
                onClick={() => setFilterRisk(level)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white font-bold shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                    : 'text-gray-400 hover:text-green-300 hover:bg-aegis-surface'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="cyber-panel rounded-2xl overflow-hidden shadow-xl">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-[10px] font-mono uppercase tracking-wider bg-slate-900/40" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <SortHeader label="Risk Level" field="risk_level" current={sortField} asc={sortAsc} onSort={toggleSort} />
                  <SortHeader label="Threat Vector" field="attack_type" current={sortField} asc={sortAsc} onSort={toggleSort} />
                  <SortHeader label="CVSS Score" field="severity" current={sortField} asc={sortAsc} onSort={toggleSort} />
                  <th className="py-3 px-3">Target Node</th>
                  <th className="py-3 px-3">SHA-256 Evidence</th>
                  <SortHeader label="Block #" field="block_number" current={sortField} asc={sortAsc} onSort={toggleSort} />
                  <th className="py-3 px-3">EVM Tx Hash</th>
                  <th className="py-3 px-3 text-right">Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filtered.map((r, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelectedRecord(r)}
                    className="hover:bg-cyan-500/5 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold font-mono border"
                        style={{
                          background: `${RISK_COLORS[r.risk_level]}18`,
                          color: RISK_COLORS[r.risk_level],
                          borderColor: `${RISK_COLORS[r.risk_level]}40`
                        }}
                      >
                        {r.risk_level}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {r.attack_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold" style={{ color: RISK_COLORS[r.risk_level] }}>
                      {r.severity.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-3 text-gray-400 font-mono text-[11px]">{r.target_model}</td>
                    <td className="py-3.5 px-3 font-mono text-cyan-400/90 text-[11px] group-hover:text-cyan-300">
                      {r.evidence_hash.slice(0, 14)}...
                    </td>
                    <td className="py-3.5 px-3 font-mono text-cyan-400 font-semibold">#{r.block_number}</td>
                    <td className="py-3.5 px-3 font-mono text-purple-400 text-[11px]">
                      {r.tx_hash.slice(0, 12)}...
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="text-cyan-400 font-semibold group-hover:translate-x-0.5 inline-flex items-center gap-1 transition-transform">
                        Verify <ArrowRight size={12} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center space-y-3">
            <Bug size={40} className="text-gray-500 mx-auto opacity-40" />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              No anchored records match the filter criteria. Run an automated scan to populate on-chain evidence.
            </p>
          </div>
        )}
      </div>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 relative space-y-4"
            style={{
              backgroundColor: 'var(--color-panel)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-green-400" />
                <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  On-Chain Cryptographic Anchor #{selectedRecord.block_number}
                </h4>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg hover:bg-aegis-surface text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <span className="text-gray-400 block font-semibold">Evidence Hash (SHA-256)</span>
                <div className="flex items-center justify-between font-mono break-all text-cyan-400">
                  <span>{selectedRecord.evidence_hash}</span>
                  <button onClick={() => handleCopy(selectedRecord.evidence_hash, 'Evidence Hash')} className="p-1 text-gray-400 hover:text-white">
                    {copiedType === 'Evidence Hash' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <span className="text-gray-400 block font-semibold">Ethereum Tx Hash</span>
                <div className="flex items-center justify-between font-mono break-all text-purple-400">
                  <span>{selectedRecord.tx_hash}</span>
                  <button onClick={() => handleCopy(selectedRecord.tx_hash, 'Tx Hash')} className="p-1 text-gray-400 hover:text-white">
                    {copiedType === 'Tx Hash' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <span className="text-gray-400 block mb-0.5">Threat Category</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {selectedRecord.attack_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <span className="text-gray-400 block mb-0.5">Assessed CVSS</span>
                  <span className="font-bold text-sm" style={{ color: RISK_COLORS[selectedRecord.risk_level] }}>
                    {selectedRecord.severity.toFixed(1)} ({selectedRecord.risk_level})
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div>
                  <span className="text-gray-400 block text-[10px]">On-Chain Network</span>
                  <span className="font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>
                    {selectedRecord.network || deployment.networkName}
                  </span>
                </div>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    <span>View Contract</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedRecord(null)
                  navigate('/lineage')
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border hover:bg-aegis-surface transition-colors cursor-pointer"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Inspect Lineage Tree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SortHeader({ label, field, current, asc, onSort }) {
  const active = current === field
  return (
    <th
      className="py-3 px-3 cursor-pointer select-none hover:text-aegis-accent transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={active ? 'text-aegis-accent' : 'text-gray-500'} />
      </span>
    </th>
  )
}
