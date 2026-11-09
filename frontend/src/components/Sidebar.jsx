import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Crosshair,
  GitFork,
  ShieldAlert,
  Radio,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Terminal,
} from 'lucide-react';
import { useState } from 'react';

const SECTIONS = [
  {
    title: 'OPERATIONS',
    items: [
      { path: '/', label: 'Dashboard', Icon: LayoutDashboard, badge: 'Live' },
      { path: '/scan', label: 'Scan Control', Icon: Crosshair },
      { path: '/lineage', label: 'Attack Lineage', Icon: GitFork, badge: 'Zero-G' },
    ],
  },
  {
    title: 'DEFENSE & AUDIT',
    items: [
      { path: '/vulnerabilities', label: 'Vulnerabilities', Icon: ShieldAlert },
      { path: '/defense', label: 'Defense Monitor', Icon: Radio, badge: '<15ms' },
      { path: '/settings', label: 'Settings', Icon: Sliders },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`h-full pt-4 border-r border-aegis-border flex flex-col transition-all duration-300 relative z-30 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
      style={{ backgroundColor: 'var(--color-panel)' }}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 mb-6">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/30 border border-green-400/40 shadow-[0_0_15px_rgba(34,197,94,0.3)] flex-shrink-0">
          <Shield className="w-5 h-5 text-green-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-widest bg-gradient-to-r from-green-400 via-emerald-300 to-white bg-clip-text text-transparent">
                AEGIS
              </h1>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-green-500/10 text-green-400 border border-green-500/30 font-bold uppercase">
                v1.0
              </span>
            </div>
            <p className="text-[10px] tracking-wider uppercase font-mono text-gray-400 truncate">
              AI Red‑Team Shield
            </p>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-5 px-3 overflow-y-auto">
        {SECTIONS.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-1">
            {!collapsed && (
              <p className="text-[10px] font-bold tracking-wider uppercase text-gray-500 px-3 mb-1.5 font-mono">
                {sec.title}
              </p>
            )}
            {sec.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-green-500/15 via-emerald-500/5 to-transparent text-green-400 border-l-2 border-green-400 shadow-[inset_0_0_12px_rgba(34,197,94,0.1)]'
                      : 'text-gray-400 hover:bg-aegis-surface hover:text-white border-l-2 border-transparent'
                  }`
                }
              >
                <item.Icon className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110" />
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* SecOps Status Card */}
      {!collapsed && (
        <div className="p-3 mx-3 mb-2 rounded-xl border border-aegis-border bg-aegis-surface/60 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              FIREWALL STATUS
            </span>
            <span className="font-mono text-green-400 font-bold text-[10px]">
              ARMED
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-400 h-1 rounded-full w-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span>Latency: 1.4ms</span>
            <span>EVM Anchor: Active</span>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-aegis-border flex items-center justify-between">
        {!collapsed && (
          <span className="text-[10px] font-mono text-gray-500 px-2 flex items-center gap-1">
            <Terminal size={11} /> 102 Tests Passing
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-aegis-surface transition-colors text-gray-400 hover:text-green-400 border border-transparent hover:border-aegis-border cursor-pointer ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
