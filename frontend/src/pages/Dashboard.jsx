import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import {
  Shield, Bug, AlertTriangle, Activity, RefreshCw, FileText,
  Search, Filter, ExternalLink, Copy, Check, X, ShieldAlert,
  ArrowRight, Sparkles, Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getScanResults, getDefenseStats, getVulnerabilities } from '../services/api';
import { useToast } from '../components/Toast';

const RISK_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

const ATTACK_COLORS = {
  prompt_injection: '#ef4444',
  jailbreak: '#f97316',
  adversarial_perturbation: '#eab308',
  data_poisoning: '#a855f7',
  model_extraction: '#3b82f6',
  membership_inference: '#06b6d4',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();

  const [scanData, setScanData] = useState(null);
  const [defenseStats, setDefenseStats] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Interactive filtering states
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [selectedAttackType, setSelectedAttackType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Vulnerability details modal
  const [activeVuln, setActiveVuln] = useState(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [scanRes, defRes, vulnRes] = await Promise.all([
        getScanResults().catch(() => ({ data: null })),
        getDefenseStats().catch(() => ({ data: null })),
        getVulnerabilities().catch(() => ({ data: null })),
      ]);
      setScanData(scanRes.data);
      setDefenseStats(defRes.data);
      setLedgerData(vulnRes.data);
      toast('Dashboard metrics refreshed', 'info');
    } catch (e) {
      toast('Failed to refresh dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const vulns = scanData?.vulnerabilities || [];
  const totalScans = scanData?.status === 'completed' ? 1 : 0;
  const totalVulns = scanData?.total_vulns || 0;
  const criticalCount = vulns.filter((v) => v.risk_level === 'CRITICAL').length;
  const blocked = defenseStats?.blocked || 0;

  // Severity distribution for pie chart
  const severityDist = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
    .map((level) => ({ name: level, value: vulns.filter((v) => v.risk_level === level).length }))
    .filter((d) => d.value > 0);

  // Attack type distribution for bar chart
  const attackDist = Object.entries(
    vulns.reduce((acc, v) => {
      const label = v.attack_type.replace(/_/g, ' ');
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({
    name: name.slice(0, 12),
    rawName: name.replace(/ /g, '_'),
    count,
    fill: ATTACK_COLORS[name.replace(/ /g, '_')] || '#6b7280',
  }));

  // Filter vulnerabilities in real-time
  const filteredVulns = vulns.filter((v) => {
    const matchesRisk = selectedRisk === 'ALL' || v.risk_level === selectedRisk;
    const matchesAttack = selectedAttackType === 'ALL' || v.attack_type === selectedAttackType;
    const matchesSearch = !searchQuery || v.payload.toLowerCase().includes(searchQuery.toLowerCase()) || v.attack_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesAttack && matchesSearch;
  });

  const handleCopyPayload = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast('Payload copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestInDefense = (payload) => {
    navigate('/defense', { state: { prompt: payload } });
  };

  const hasActiveFilter = selectedRisk !== 'ALL' || selectedAttackType !== 'ALL' || searchQuery.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30 font-bold uppercase tracking-wider">
              SecOps Command Center
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Security Operations & Threat Matrix
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Real-time AI vulnerability posture, continuous red-team mutation, and live inference firewall
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/report/export?format=html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600/15 border border-blue-500/40 rounded-xl text-xs text-blue-400 hover:text-white hover:bg-blue-600 transition-all font-semibold cursor-pointer shadow-sm active:scale-95"
          >
            <FileText size={13} />
            <span>EU AI Act Report</span>
          </a>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-sm hover:border-cyan-400/50 disabled:opacity-60 cursor-pointer active:scale-95"
            style={{
              backgroundColor: 'var(--color-panel)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-cyan-400' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* CyberSecOps Tactical Ribbon */}
      <div className="p-4 rounded-2xl border border-emerald-500/30 dark:border-green-500/30 bg-gradient-to-r from-emerald-50 via-green-50/50 to-teal-50 dark:from-[#08120a] dark:via-[#050b07] dark:to-[#0a180e] backdrop-blur-md shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
            <ShieldAlert size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wider text-emerald-950 dark:text-green-400 uppercase">
                Active Inference Defense: Armed
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-xs text-slate-700 dark:text-gray-300">
              Heuristic and vector cosine firewall active • Sub-15ms threat interception • Multi-chain EVM anchor verified
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-green-500/20 dark:hover:bg-green-500/30 dark:text-green-300 border border-emerald-600 dark:border-green-500/40 text-xs font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(34,197,94,0.2)] active:scale-95"
          >
            <Sparkles size={13} />
            <span>New Scan</span>
          </button>
          <button
            onClick={() => navigate('/defense')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-300 border border-teal-600 dark:border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(34,197,94,0.2)] active:scale-95"
          >
            <Zap size={13} />
            <span>Test Defense Proxy</span>
          </button>
        </div>
      </div>

      {/* Interactive Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Shield}
          label="Scans Run"
          value={totalScans}
          color="text-emerald-600 dark:text-green-400"
          accentColor="#22c55e"
          tag="Automated Suite"
          onClick={() => navigate('/scan')}
          actionText="New Scan →"
        />
        <StatCard
          icon={Bug}
          label="Vulns Found"
          value={totalVulns}
          color="text-rose-600 dark:text-rose-400"
          accentColor="#f43f5e"
          tag="Detected Threats"
          onClick={() => setSelectedRisk('ALL')}
          actionText="Show all"
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical Threats"
          value={criticalCount}
          color="text-amber-600 dark:text-amber-400"
          accentColor="#f59e0b"
          tag="Requires Action"
          onClick={() => setSelectedRisk(selectedRisk === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          actionText={selectedRisk === 'CRITICAL' ? 'Active Filter ✕' : 'Filter Critical'}
          isActive={selectedRisk === 'CRITICAL'}
        />
        <StatCard
          icon={Activity}
          label="Firewall Interceptions"
          value={blocked}
          color="text-green-600 dark:text-emerald-400"
          accentColor="#10b981"
          tag="Live Proxy"
          onClick={() => navigate('/defense')}
          actionText="View Firewall →"
        />
      </div>

      {/* Charts Row with Clickable Filtering */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title="Severity Distribution"
          subtitle="Click any slice to filter vulnerabilities"
        >
          {severityDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={severityDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  onClick={(entry) => {
                    setSelectedRisk(selectedRisk === entry.name ? 'ALL' : entry.name);
                    toast(`Filtered by ${entry.name} severity`, 'info');
                  }}
                  className="cursor-pointer"
                >
                  {severityDist.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={RISK_COLORS[entry.name]}
                      stroke={selectedRisk === entry.name ? '#ffffff' : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-panel)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Run a scan to see severity distribution" />
          )}
        </Panel>

        <Panel
          title="Attacks by Type"
          subtitle="Click any bar to filter by attack vector"
        >
          {attackDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attackDist}>
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-panel)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text-primary)',
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  onClick={(entry) => {
                    setSelectedAttackType(selectedAttackType === entry.rawName ? 'ALL' : entry.rawName);
                    toast(`Filtered by ${entry.name}`, 'info');
                  }}
                  className="cursor-pointer"
                >
                  {attackDist.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.fill}
                      opacity={selectedAttackType === 'ALL' || selectedAttackType === entry.rawName ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Run a scan to see attack distribution" />
          )}
        </Panel>
      </div>

      {/* Interactive Vulnerabilities Table & Filter Suite */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Discovered Vulnerabilities ({filteredVulns.length})
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Click any payload row to inspect full prompt, replay in defense firewall, or track lineage
            </p>
          </div>

          {/* Quick Filters & Search */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search payload..."
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:border-aegis-accent transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Risk filter buttons */}
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((risk) => (
              <button
                key={risk}
                onClick={() => setSelectedRisk(risk)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedRisk === risk
                    ? 'bg-aegis-accent text-white shadow-sm'
                    : 'border border-aegis-border hover:bg-aegis-surface text-gray-400'
                }`}
              >
                {risk}
              </button>
            ))}

            {hasActiveFilter && (
              <button
                onClick={() => {
                  setSelectedRisk('ALL');
                  setSelectedAttackType('ALL');
                  setSearchQuery('');
                }}
                className="text-xs text-red-400 hover:underline px-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List of vulnerabilities */}
        {filteredVulns.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {filteredVulns.slice(0, 15).map((v, i) => (
              <div
                key={i}
                onClick={() => setActiveVuln(v)}
                className="flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:border-aegis-accent/50 hover:shadow-md group"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                  <RiskBadge level={v.risk_level} />
                  <span
                    className="font-mono text-xs truncate flex-1 group-hover:text-aegis-accent transition-colors"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {v.payload}
                  </span>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {v.attack_type.replace(/_/g, ' ')}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded font-mono"
                    style={{
                      backgroundColor: `${RISK_COLORS[v.risk_level]}15`,
                      color: RISK_COLORS[v.risk_level],
                    }}
                  >
                    CVSS {v.severity.toFixed(1)}
                  </span>
                  <ArrowRight size={14} className="text-gray-400 group-hover:text-aegis-accent group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text={hasActiveFilter ? 'No vulnerabilities match the current filter.' : 'No vulnerabilities discovered yet.'} />
        )}
      </Card>

      {/* Vulnerability Inspector Modal / Dialog */}
      {activeVuln && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-xl rounded-2xl border shadow-2xl p-6 relative overflow-hidden space-y-5"
            style={{
              backgroundColor: 'var(--color-panel)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2.5">
                <RiskBadge level={activeVuln.risk_level} />
                <h4 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
                  Vulnerability Inspection
                </h4>
              </div>
              <button
                onClick={() => setActiveVuln(null)}
                className="p-1 rounded-lg hover:bg-aegis-surface text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Payload preview box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  EXPLOIT PAYLOAD
                </span>
                <button
                  onClick={() => handleCopyPayload(activeVuln.payload)}
                  className="flex items-center gap-1 text-xs text-aegis-accent hover:underline cursor-pointer"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy Payload'}</span>
                </button>
              </div>
              <div
                className="p-3.5 rounded-xl border font-mono text-xs break-all max-h-36 overflow-auto"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {activeVuln.payload}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <span className="text-gray-400 block mb-1">Attack Vector</span>
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {activeVuln.attack_type.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <span className="text-gray-400 block mb-1">CVSS Severity</span>
                <span className="font-bold text-sm" style={{ color: RISK_COLORS[activeVuln.risk_level] }}>
                  {activeVuln.severity.toFixed(1)} / 10.0 ({activeVuln.risk_level})
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => navigate('/lineage')}
                className="px-3.5 py-2 rounded-lg text-xs font-medium border hover:bg-aegis-surface transition-colors cursor-pointer"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                View in Attack Lineage
              </button>
              <button
                onClick={() => handleTestInDefense(activeVuln.payload)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-aegis-accent text-white hover:opacity-90 shadow-sm transition-all cursor-pointer"
              >
                <Zap size={13} />
                <span>Test in Defense Proxy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, tag, onClick, actionText, isActive, accentColor }) {
  return (
    <div
      onClick={onClick}
      className={`cyber-panel-interactive rounded-2xl p-5 border relative overflow-hidden cursor-pointer group shadow-md ${
        isActive ? 'ring-2 ring-cyan-400' : ''
      }`}
      style={{
        borderTopWidth: '3px',
        borderTopColor: accentColor || 'rgba(56, 189, 248, 0.6)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold tracking-wider uppercase font-mono text-slate-800 dark:text-slate-100">
          {label}
        </span>
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-aegis-surface transition-transform group-hover:scale-110">
          <Icon size={18} className={color} />
        </div>
      </div>
      <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t text-[11px] font-mono border-slate-200 dark:border-slate-800">
        <span className="text-slate-600 dark:text-slate-300 font-medium">{tag}</span>
        <span className="text-emerald-700 dark:text-green-400 font-bold group-hover:underline flex items-center gap-0.5">
          {actionText}
        </span>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </Card>
  );
}

function RiskBadge({ level }) {
  return (
    <span
      className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase"
      style={{
        background: `${RISK_COLORS[level]}15`,
        color: RISK_COLORS[level],
        border: `1px solid ${RISK_COLORS[level]}30`,
      }}
    >
      {level}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="py-10 text-center space-y-1">
      <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {text}
      </p>
    </div>
  );
}
