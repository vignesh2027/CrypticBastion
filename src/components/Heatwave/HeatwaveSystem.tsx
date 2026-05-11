import { motion } from 'framer-motion';
import type { CountryPressure } from '../../types';

interface HeatwaveSystemProps {
  pressure: CountryPressure[];
}

const STATUS_CONFIG = {
  calm: { color: '#22c55e', bg: 'bg-green-950/20', border: 'border-green-500/20', text: 'text-green-400', bar: '#22c55e' },
  elevated: { color: '#eab308', bg: 'bg-yellow-950/20', border: 'border-yellow-500/20', text: 'text-yellow-400', bar: '#eab308' },
  'high-risk': { color: '#f97316', bg: 'bg-orange-950/20', border: 'border-orange-500/20', text: 'text-orange-400', bar: '#f97316' },
  critical: { color: '#ef4444', bg: 'bg-red-950/20', border: 'border-red-500/20', text: 'text-red-400', bar: '#ef4444' },
  'under-attack': { color: '#dc2626', bg: 'bg-red-950/40', border: 'border-red-600/50', text: 'text-red-300', bar: '#dc2626' },
} as const;

export default function HeatwaveSystem({ pressure }: HeatwaveSystemProps) {
  const sorted = [...pressure].sort((a, b) => b.pressure - a.pressure);
  const globalIndex = pressure.length
    ? Math.round(pressure.reduce((s, p) => s + p.pressure, 0) / pressure.length)
    : 0;

  const statusCounts = pressure.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const globalStatus = globalIndex > 70 ? 'under-attack' : globalIndex > 50 ? 'critical' : globalIndex > 30 ? 'high-risk' : globalIndex > 15 ? 'elevated' : 'calm';
  const globalCfg = STATUS_CONFIG[globalStatus];

  return (
    <div className="flex flex-col h-full glass rounded-xl border border-cyber-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-red animate-pulse" />
          <span className="text-cyber-red font-mono text-sm font-semibold tracking-wider">CYBER HEATWAVE</span>
        </div>
        <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${globalCfg.text} ${globalCfg.border}`}>
          GLOBAL: {globalIndex}%
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-5 gap-px bg-cyber-border flex-shrink-0">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div key={status} className={`${cfg.bg} px-2 py-2 text-center`}>
            <p className={`text-sm font-mono font-bold ${cfg.text}`}>{statusCounts[status] ?? 0}</p>
            <p className="text-[9px] text-slate-500 font-mono uppercase leading-tight">{status.replace('-', '\n')}</p>
          </div>
        ))}
      </div>

      {/* Global pressure indicator */}
      <div className="px-4 py-3 border-b border-cyber-border flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono text-slate-400">PLANETARY PRESSURE INDEX</span>
          <span className={`text-sm font-mono font-bold ${globalCfg.text}`}>{globalIndex}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full relative"
            style={{ background: `linear-gradient(90deg, #22c55e, #eab308, #f97316, #ef4444)` }}
            animate={{ width: `${globalIndex}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {globalIndex > 50 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white/50 rounded-full animate-pulse" />
            )}
          </motion.div>
        </div>
      </div>

      {/* Country list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {sorted.map((country, idx) => (
          <CountryRow key={country.countryCode} country={country} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
}

function CountryRow({ country, rank }: { country: CountryPressure; rank: number }) {
  const cfg = STATUS_CONFIG[country.status];

  return (
    <motion.div
      layout
      className={`rounded-lg border p-2.5 ${cfg.bg} ${cfg.border} transition-all duration-500`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-slate-600 w-5 text-right flex-shrink-0">{rank}</span>
        <span className="font-mono text-xs font-bold text-white flex-shrink-0 w-7">{country.countryCode}</span>
        <span className="text-xs font-mono text-slate-400 flex-1 truncate">{country.country}</span>
        <span className="text-xs font-mono text-slate-500 flex-shrink-0">{country.attackCount} atk</span>
        <span className={`text-xs font-mono font-bold flex-shrink-0 w-10 text-right ${cfg.text}`}>{country.pressure}%</span>
      </div>
      <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: cfg.bar, boxShadow: `0 0 4px ${cfg.bar}80` }}
          animate={{ width: `${country.pressure}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </motion.div>
  );
}
