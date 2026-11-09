import { useState, useRef, useEffect } from 'react';
import { Cpu, Check, ChevronDown, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ModelSelector({
  targets = [],
  selectedId,
  onSelect,
  className = '',
  size = 'md', // 'sm' | 'md'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedTarget = targets.find((t) => t.id === selectedId) || targets[0] || {
    id: 'mock',
    name: 'Mock LLM (Sandboxed)',
    available: true,
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 rounded-xl border transition-all cursor-pointer select-none text-left ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm'
        } ${
          isOpen
            ? 'border-green-400 bg-green-950/20 shadow-[0_0_15px_rgba(34,197,94,0.25)]'
            : 'border-aegis-border bg-aegis-surface hover:border-green-500/40 hover:bg-aegis-panel'
        }`}
        style={{ color: 'var(--color-text-primary)' }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
          <div
            className={`flex items-center justify-center rounded-lg flex-shrink-0 ${
              size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'
            } ${
              selectedTarget.available
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}
          >
            <Cpu size={size === 'sm' ? 12 : 15} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{selectedTarget.name}</span>
              <span
                className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-full border ${
                  selectedTarget.available
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}
              >
                {selectedTarget.available ? 'Ready' : 'Simulated'}
              </span>
            </div>
            {size !== 'sm' && (
              <span className="text-[10px] block font-mono text-gray-400 dark:text-gray-400 truncate">
                {selectedTarget.id} • Latency ~12ms
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform flex-shrink-0 duration-200 ${
            isOpen ? 'rotate-180 text-green-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 mt-1.5 z-50 rounded-xl border border-green-500/30 bg-[#070d09]/95 dark:bg-[#070d09]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] p-1.5 space-y-1 animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden"
          role="listbox"
        >
          <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-green-400/80 border-b border-emerald-950/60 flex items-center justify-between">
            <span>Select Target Engine</span>
            <span className="text-gray-400 font-normal">{targets.length} options</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 py-1">
            {targets.map((target) => {
              const isSelected = target.id === selectedTarget.id;
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => {
                    onSelect(target.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-green-500/15 border border-green-500/40 text-green-200'
                      : 'hover:bg-slate-800/80 text-slate-200 border border-transparent'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        target.available ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                        <span className="truncate">{target.name}</span>
                        {!target.available && (
                          <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Simulated
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        ID: {target.id} {target.available ? '• Port 11434' : '• In-Memory Proxy'}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check size={14} className="text-green-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
