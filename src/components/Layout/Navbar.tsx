import { motion } from 'framer-motion';
import type { ActiveView } from '../../types';

interface NavbarProps {
  activeView: ActiveView;
  onViewChange: (v: ActiveView) => void;
  threatCount: number;
  criticalCount: number;
  wsStatus: 'live' | 'connecting' | 'offline';
}

const VIEWS: { id: ActiveView; label: string; icon: string; color: string }[] = [
  { id: 'globe', label: 'THREAT NEXUS', icon: '⬡', color: 'text-cyber-cyan' },
  { id: 'threatstream', label: 'THREATSTREAM', icon: '⚡', color: 'text-cyber-blue' },
  { id: 'protocol', label: 'PROTOCOLS', icon: '◈', color: 'text-cyber-violet' },
  { id: 'infra', label: 'INFRA GRID', icon: '⬡', color: 'text-cyber-green' },
  { id: 'replay', label: 'REPLAY', icon: '⏮', color: 'text-slate-400' },
  { id: 'heatwave', label: 'HEATWAVE', icon: '⬥', color: 'text-cyber-red' },
  { id: 'chain', label: 'ATK CHAIN', icon: '◉', color: 'text-purple-400' },
  { id: 'cve', label: 'CVE FEED', icon: '⚠', color: 'text-orange-400' },
];

const WS_CONFIG = {
  live: { dot: 'bg-green-400', label: 'LIVE', text: 'text-green-400' },
  connecting: { dot: 'bg-yellow-400 animate-pulse', label: 'CONNECTING', text: 'text-yellow-400' },
  offline: { dot: 'bg-red-400', label: 'OFFLINE', text: 'text-red-400' },
};

export default function Navbar({ activeView, onViewChange, threatCount, criticalCount, wsStatus }: NavbarProps) {
  const ws = WS_CONFIG[wsStatus];

  return (
    <nav className="flex-shrink-0 h-14 glass border-b border-cyber-border flex items-center justify-between px-4 z-50">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative w-7 h-7">
          <div className="absolute inset-0 border-2 border-cyber-cyan rotate-45 rounded-sm" style={{ boxShadow: '0 0 10px #06b6d4' }} />
          <div className="absolute inset-1.5 bg-cyber-cyan rotate-45 rounded-sm opacity-60" />
        </div>
        <div>
          <span className="font-display text-base font-bold text-white tracking-widest text-glow-cyan">CRYPTIC</span>
          <span className="font-display text-base font-bold text-cyber-cyan tracking-widest">BASTION</span>
        </div>
        <div className="h-4 w-px bg-cyber-border mx-1" />
        <span className="text-xs font-mono text-slate-500 hidden md:block">CYBER INTELLIGENCE PLATFORM</span>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-1">
        {VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`
              relative px-3 py-1.5 text-xs font-mono rounded transition-all duration-150
              ${activeView === view.id
                ? `${view.color} bg-slate-800/80 border border-slate-700`
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              }
            `}
          >
            <span className="hidden lg:inline mr-1">{view.icon}</span>
            {view.label}
            {activeView === view.id && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyber-cyan rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="hidden md:flex items-center gap-2">
          {criticalCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 bg-red-950/40 border border-red-500/40 px-2 py-0.5 rounded"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-fast" />
              <span className="text-red-400">{criticalCount} CRIT</span>
            </motion.div>
          )}
          <span className="text-slate-600">{threatCount} events</span>
        </div>
        <div className="flex items-center gap-1.5 border border-slate-700/50 rounded px-2 py-1">
          <div className={`w-1.5 h-1.5 rounded-full ${ws.dot}`} />
          <span className={ws.text}>{ws.label}</span>
        </div>
      </div>
    </nav>
  );
}
