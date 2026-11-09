import React, { useState, useEffect } from 'react'
import {
  Key, Cpu, Clock, Shield, Moon, Sun, Activity, Check, Save,
  Eye, EyeOff, Layers, Globe, RefreshCw, AlertTriangle
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { useTheme } from '../context/ThemeContext'
import { getSettings, saveSettings, getBlockchainStatus, getSchedulerStatus, triggerSchedulerAudit } from '../services/api'

export default function Settings() {
  const toast = useToast()
  const { theme, toggleTheme } = useTheme()

  const [zeroGEnabled, setZeroGEnabled] = useState(
    localStorage.getItem('zero-g-enabled') !== 'false'
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKeys, setShowKeys] = useState({
    openai: false,
    gemini: false,
    anthropic: false,
  })

  const [form, setForm] = useState({
    openai_api_key: '',
    gemini_api_key: '',
    anthropic_api_key: '',
    ollama_host: 'http://localhost:11434',
    guard_block_threshold: 0.75,
    auto_anchor_blockchain: true,
    scan_schedule: 'manual',
  })

  const [rawPresent, setRawPresent] = useState({
    openai: false,
    gemini: false,
    anthropic: false,
  })

  const [blockchainInfo, setBlockchainInfo] = useState(null)
  const [schedulerStatus, setSchedulerStatus] = useState(null)
  const [triggeringSweep, setTriggeringSweep] = useState(false)

  const fetchScheduler = () => {
    getSchedulerStatus()
      .then(res => setSchedulerStatus(res.data))
      .catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      getSettings().catch(() => ({ data: { settings: {} } })),
      getBlockchainStatus().catch(() => ({ data: null })),
      getSchedulerStatus().catch(() => ({ data: null })),
    ]).then(([setRes, bcRes, schedRes]) => {
      if (setRes.data?.settings) {
        setForm(prev => ({
          ...prev,
          ...setRes.data.settings,
        }))
        if (setRes.data.raw_keys_present) {
          setRawPresent(setRes.data.raw_keys_present)
        }
      }
      if (bcRes?.data) {
        setBlockchainInfo(bcRes.data)
      }
      if (schedRes?.data) {
        setSchedulerStatus(schedRes.data)
      }
      setLoading(false)
    })
  }, [])

  const handleManualSweep = async () => {
    setTriggeringSweep(true)
    try {
      const res = await triggerSchedulerAudit('mock')
      toast(`Autonomous sweep completed: ${res.data?.result?.vulnerabilities_discovered ?? 0} vulns identified`, 'success')
      fetchScheduler()
    } catch (err) {
      toast(`Sweep failed: ${err.message}`, 'error')
    } finally {
      setTriggeringSweep(false)
    }
  }

  const handleToggleTheme = () => {
    toggleTheme()
    toast(`Switched theme to ${theme === 'dark' ? 'light' : 'dark'} mode`, 'info')
  }

  const toggleZeroG = () => {
    const next = !zeroGEnabled
    setZeroGEnabled(next)
    localStorage.setItem('zero-g-enabled', String(next))
    toast(`Zero‑G Force Physics ${next ? 'Activated' : 'Suspended'}`, 'info')
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    setSaving(true)
    try {
      await saveSettings(form)
      toast('Enterprise settings & API credentials updated', 'success')
      // Refresh presence status & scheduler
      const res = await getSettings()
      if (res.data?.raw_keys_present) {
        setRawPresent(res.data.raw_keys_present)
      }
      fetchScheduler()
    } catch (err) {
      toast(`Failed to save settings: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            System Settings & Security Config
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Manage commercial LLM API credentials, automated scanning schedules, and on-chain parameters.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Commercial Cloud LLM Keys */}
        <div className="bg-aegis-panel border border-aegis-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Key size={16} className="text-aegis-accent" /> Commercial Cloud LLM Keys
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              AES-256 Storage
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Add optional commercial provider keys to benchmark attacks against frontier models.
          </p>

          {/* OpenAI */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                <span>OpenAI API Key</span>
                {rawPresent.openai && (
                  <span className="text-[10px] text-green-400 font-normal flex items-center gap-0.5">
                    <Check size={10} /> Active
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowKeys(p => ({ ...p, openai: !p.openai }))}
                className="text-gray-400 hover:text-white"
              >
                {showKeys.openai ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <input
              type={showKeys.openai ? 'text' : 'password'}
              placeholder="sk-proj-..."
              value={form.openai_api_key || ''}
              onChange={e => setForm(p => ({ ...p, openai_api_key: e.target.value }))}
              className="w-full bg-aegis-surface border border-aegis-border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-aegis-accent"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>

          {/* Google Gemini */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                <span>Google Gemini API Key</span>
                {rawPresent.gemini && (
                  <span className="text-[10px] text-green-400 font-normal flex items-center gap-0.5">
                    <Check size={10} /> Active
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowKeys(p => ({ ...p, gemini: !p.gemini }))}
                className="text-gray-400 hover:text-white"
              >
                {showKeys.gemini ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <input
              type={showKeys.gemini ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={form.gemini_api_key || ''}
              onChange={e => setForm(p => ({ ...p, gemini_api_key: e.target.value }))}
              className="w-full bg-aegis-surface border border-aegis-border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-aegis-accent"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>

          {/* Anthropic */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                <span>Anthropic API Key</span>
                {rawPresent.anthropic && (
                  <span className="text-[10px] text-green-400 font-normal flex items-center gap-0.5">
                    <Check size={10} /> Active
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowKeys(p => ({ ...p, anthropic: !p.anthropic }))}
                className="text-gray-400 hover:text-white"
              >
                {showKeys.anthropic ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <input
              type={showKeys.anthropic ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={form.anthropic_api_key || ''}
              onChange={e => setForm(p => ({ ...p, anthropic_api_key: e.target.value }))}
              className="w-full bg-aegis-surface border border-aegis-border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-aegis-accent"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>

          {/* Ollama Host */}
          <div className="space-y-1.5">
            <label className="font-semibold text-xs block" style={{ color: 'var(--color-text-primary)' }}>
              Local Ollama Daemon URL
            </label>
            <input
              type="text"
              value={form.ollama_host || ''}
              onChange={e => setForm(p => ({ ...p, ollama_host: e.target.value }))}
              className="w-full bg-aegis-surface border border-aegis-border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-aegis-accent"
              style={{ color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        {/* Section 2: Automated Scan Scheduler & Defense Guard */}
        <div className="space-y-6">
          <div className="bg-aegis-panel border border-aegis-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Clock size={16} className="text-aegis-accent" /> Autonomous Scan Scheduling
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Configure recurring background audits to continuously test models against emerging mutations.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Audit Frequency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'manual', label: 'Manual Only' },
                    { id: 'hourly', label: 'Every 1 Hour' },
                    { id: 'every_6h', label: 'Every 6 Hours' },
                    { id: 'daily', label: 'Daily (02:00 UTC)' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, scan_schedule: opt.id }))}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                        form.scan_schedule === opt.id
                          ? 'bg-aegis-accent/15 border-aegis-accent text-aegis-accent shadow-sm'
                          : 'border-aegis-border text-gray-400 hover:bg-aegis-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduler Daemon Live Status Card */}
              <div className="p-3 bg-aegis-surface/60 border border-aegis-border/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-aegis-accent animate-pulse" />
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Daemon Status: {schedulerStatus?.active ? (form.scan_schedule === 'manual' ? 'Standby (Manual Mode)' : `Active (${form.scan_schedule})`) : 'Initializing'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={triggeringSweep}
                    onClick={handleManualSweep}
                    className="px-2.5 py-1 rounded-lg bg-aegis-accent/10 border border-aegis-accent/40 text-aegis-accent hover:bg-aegis-accent/20 text-[11px] font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={triggeringSweep ? 'animate-spin' : ''} />
                    {triggeringSweep ? 'Auditing...' : 'Run Sweep Now'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-gray-400 pt-1 border-t border-aegis-border/40">
                  <div>
                    <span className="text-[10px] uppercase text-gray-500 block">Total Sweeps</span>
                    <span className="text-aegis-accent font-bold">{schedulerStatus?.total_runs_completed ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-gray-500 block">Last Vulns Found</span>
                    <span className="text-amber-400 font-bold">{schedulerStatus?.last_vulns_discovered ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-gray-500 block">Next Sweep</span>
                    <span className="text-gray-300 truncate block">
                      {schedulerStatus?.next_run ? new Date(schedulerStatus.next_run).toLocaleTimeString() : 'N/A (Manual)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Defense Guard Threshold */}
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Defense Firewall Rejection Threshold</span>
                  <span className="font-mono text-aegis-accent font-bold">
                    {(form.guard_block_threshold * 100).toFixed(0)}% Malicious Confidence
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  value={form.guard_block_threshold}
                  onChange={e => setForm(p => ({ ...p, guard_block_threshold: parseFloat(e.target.value) }))}
                  className="w-full accent-aegis-accent cursor-pointer"
                />
                <span className="text-[11px] text-gray-500 block mt-1">
                  Prompts scoring above this confidence level are terminated with HTTP 403 in &lt;15ms.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Visual & Physics Preferences */}
          <div className="bg-aegis-panel border border-aegis-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Activity size={16} className="text-aegis-accent" /> UI Theme & Simulation Engine
            </h3>

            <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-xs font-semibold block" style={{ color: 'var(--color-text-primary)' }}>Interface Theme</span>
                <span className="text-[11px] text-gray-400">Toggle between high-contrast Dark and crisp Light modes</span>
              </div>
              <button
                type="button"
                onClick={handleToggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-aegis-border bg-aegis-panel text-xs font-semibold cursor-pointer hover:border-aegis-accent transition-all shadow-sm active:scale-95"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {theme === 'dark' ? <Moon size={13} className="text-green-400" /> : <Sun size={13} className="text-amber-500" />}
                <span>{theme === 'dark' ? 'Dark (Black & Green)' : 'Light (Mint Green)'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-xs font-semibold block" style={{ color: 'var(--color-text-primary)' }}>Zero‑G Floating Dynamics</span>
                <span className="text-[11px] text-gray-400">Enable organic harmonic force simulation in Attack Lineage</span>
              </div>
              <button
                type="button"
                onClick={toggleZeroG}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  zeroGEnabled
                    ? 'bg-aegis-accent/15 border-aegis-accent text-aegis-accent'
                    : 'border-aegis-border text-gray-400 hover:bg-aegis-panel'
                }`}
              >
                {zeroGEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* On-Chain & Deployment Metadata Banner */}
      {blockchainInfo && (
        <div className="bg-aegis-panel border border-aegis-border rounded-2xl p-4 text-xs flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-green-400" />
            <div>
              <span className="font-semibold block" style={{ color: 'var(--color-text-primary)' }}>
                Decentralized Audit Anchor: {blockchainInfo.networkName || blockchainInfo.network}
              </span>
              <span className="font-mono text-gray-400 text-[11px]">
                Contract: {blockchainInfo.contractAddress} (Chain ID: {blockchainInfo.chainId})
              </span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-gray-400">
            AEGIS Production Engine v1.0 • EIP-155 Verified
          </div>
        </div>
      )}
    </div>
  )
}
