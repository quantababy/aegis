import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Moon, Sun, Bell, Search, ShieldAlert, CheckCircle2,
  Zap, Compass, ArrowRight, X, Clock, ShieldCheck, Globe
} from 'lucide-react';
import { getBlockchainStatus } from '../services/api';

const SEARCH_ROUTES = [
  { label: 'Dashboard Overview', path: '/', category: 'Overview', icon: '📊' },
  { label: 'Automated Scan Control', path: '/scan', category: 'Testing', icon: '🎯' },
  { label: 'Attack Mutation Lineage (Zero-G Graph)', path: '/lineage', category: 'Visualization', icon: '🧬' },
  { label: 'Vulnerabilities & Proofs', path: '/vulnerabilities', category: 'Audit', icon: '⛓️' },
  { label: 'Live Defense Monitor & Firewall', path: '/defense', category: 'Protection', icon: '🛡️' },
  { label: 'System Settings & Cloud API Keys', path: '/settings', category: 'Config', icon: '⚙️' },
  { label: 'Swagger API Reference (Docs)', path: '/docs', category: 'Docs', icon: '📖', external: true },
  { label: 'Live System Health Status', path: '/health', category: 'Monitoring', icon: '💓', external: true },
];

const INITIAL_NOTIFICATIONS = [
  { id: 1, title: 'Zero-G Physics Active', desc: 'D3 multi-body force simulation running', time: 'Just now', unread: true },
  { id: 2, title: 'Multi-Chain EVM Anchors', desc: 'Sepolia & Arbitrum testnet deployment ready', time: '5m ago', unread: true },
  { id: 3, title: 'Defense Firewall Active', desc: 'Live inference proxy rejecting payloads <15ms', time: '1h ago', unread: false },
];

export default function TopBar() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [timeStr, setTimeStr] = useState('');
  const [networkName, setNetworkName] = useState('Sepolia EVM');

  // Search & Navigation state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Notification dropdown state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const notifRef = useRef(null);

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch active network
  useEffect(() => {
    getBlockchainStatus()
      .then(res => {
        if (res.data?.networkName) {
          setNetworkName(res.data.networkName.replace(' Testnet', ''));
        }
      })
      .catch(() => {});
  }, []);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRoutes = SEARCH_ROUTES.filter(r =>
    r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectRoute = (route) => {
    if (route.external) {
      window.open(route.path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(route.path);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header
      className="flex items-center justify-between px-6 py-2.5 border-b border-aegis-border shadow-sm transition-colors relative z-40"
      style={{ backgroundColor: 'var(--color-panel)' }}
    >
      {/* Left controls: Theme toggle & Quick Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-aegis-surface transition-all border border-aegis-border cursor-pointer active:scale-95 shadow-sm"
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" />
          )}
        </button>

        {/* Quick Command Search */}
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search or jump to page..."
              className="pl-8 pr-14 py-1.5 w-60 md:w-72 rounded-xl text-xs bg-aegis-surface border border-aegis-border focus:border-green-400 focus:outline-none transition-all shadow-inner"
              style={{ color: 'var(--color-text-primary)' }}
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-aegis-panel border border-aegis-border text-[9px] font-mono text-gray-400">
              Ctrl+K
            </kbd>
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && (
            <div
              className="absolute left-0 mt-2 w-80 md:w-96 rounded-2xl border border-green-500/20 shadow-2xl p-2 z-50 backdrop-blur-md"
              style={{ backgroundColor: 'var(--color-panel)' }}
            >
              <div className="text-[10px] font-mono px-3 py-1 text-gray-400 uppercase tracking-wider">
                Command Palette Navigation
              </div>
              <div className="space-y-1 mt-1 max-h-60 overflow-auto">
                {filteredRoutes.map((route, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectRoute(route)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs hover:bg-aegis-surface transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{route.icon}</span>
                      <div>
                        <p className="font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>
                          {route.label}
                        </p>
                        <span className="text-[10px] text-gray-400 font-mono">{route.category}</span>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-gray-400 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center SecOps Telemetry Strip */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-gray-400">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 font-semibold text-[11px] shadow-[0_0_10px_rgba(34,197,94,0.15)]">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          <span>DEFCON 4 • ACTIVE SHIELD</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-aegis-surface border border-aegis-border text-[11px]" style={{ color: 'var(--color-text-primary)' }}>
          <Globe size={12} className="text-green-400" />
          <span>{networkName}</span>
        </div>

        {timeStr && (
          <div className="flex items-center gap-1.5 text-green-400/80 text-[11px] font-mono">
            <Clock size={12} />
            <span>{timeStr}</span>
          </div>
        )}
      </div>

      {/* Right controls: Notifications */}
      <div className="flex items-center gap-3">
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl hover:bg-aegis-surface transition-all relative border border-aegis-border cursor-pointer active:scale-95 shadow-sm"
            aria-label="Notifications"
            title="System Security Alerts"
          >
            <Bell className="w-4 h-4 text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_#22c55e]" />
            )}
          </button>

          {/* Notification Popover */}
          {isNotifOpen && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-2xl border border-green-500/20 shadow-2xl p-3 z-50 backdrop-blur-md"
              style={{ backgroundColor: 'var(--color-panel)' }}
            >
              <div className="flex items-center justify-between border-b pb-2 mb-2" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-xs font-bold font-mono tracking-wider" style={{ color: 'var(--color-text-primary)' }}>
                  SECURITY DISPATCH
                </span>
                <button
                  onClick={() => setNotifications(notifications.map(n => ({ ...n, unread: false })))}
                  className="text-[10px] text-green-400 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl border border-aegis-border hover:border-cyan-500/40 transition-colors"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-[11px]" style={{ color: 'var(--color-text-primary)' }}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-gray-400">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
