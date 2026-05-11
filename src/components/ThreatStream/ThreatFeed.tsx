import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ThreatEvent, Severity } from '../../types';

interface ThreatFeedProps {
  events: ThreatEvent[];
  onSelect?: (e: ThreatEvent) => void;
  selected?: ThreatEvent | null;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string; dot: string }> = {
  low: { label: 'LOW', bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  medium: { label: 'MED', bg: 'bg-yellow-950/40', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  elevated: { label: 'ELEV', bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  critical: { label: 'CRIT', bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
};

function formatTime(ts: number) {
  return new Date(ts).toISOString().slice(11, 19);
}

export default function ThreatFeed({ events, onSelect, selected }: ThreatFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isUserScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

  const handleScroll = () => {
    isUserScrolling.current = true;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => { isUserScrolling.current = false; }, 3000);
  };

  const counts = events.reduce<Record<Severity, number>>(
    (acc, e) => { acc[e.severity]++; return acc; },
    { low: 0, medium: 0, elevated: 0, critical: 0 }
  );

  return (
    <div className="flex flex-col h-full glass rounded-xl border border-cyber-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
          <span className="text-cyber-cyan font-mono text-sm font-semibold tracking-wider">THREATSTREAM ENGINE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-mono">{events.length} events</span>
        </div>
      </div>

      {/* Severity counters */}
      <div className="grid grid-cols-4 gap-px bg-cyber-border flex-shrink-0">
        {(Object.entries(counts) as [Severity, number][]).map(([sev, count]) => {
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <div key={sev} className={`${cfg.bg} px-3 py-2 text-center`}>
              <p className={`text-base font-mono font-bold ${cfg.text}`}>{count}</p>
              <p className="text-xs text-slate-500 font-mono">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-1 p-2"
      >
        <AnimatePresence initial={false}>
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={selected?.id === event.id}
              onClick={() => onSelect?.(event)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EventCard({ event, isSelected, onClick }: { event: ThreatEvent; isSelected: boolean; onClick: () => void }) {
  const cfg = SEVERITY_CONFIG[event.severity];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className={`
        rounded-lg border p-2.5 cursor-pointer transition-all duration-150
        ${cfg.bg} ${cfg.border}
        ${isSelected ? 'ring-1 ring-cyber-cyan/50 border-cyber-cyan/40' : 'glass-hover'}
      `}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`relative w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${event.severity === 'critical' ? 'animate-pulse-fast' : ''}`} />
          <span className={`text-xs font-mono font-bold ${cfg.text} px-1.5 py-0.5 rounded border ${cfg.border}`}>
            {cfg.label}
          </span>
          <span className="text-xs font-mono text-slate-300 truncate max-w-[120px]">{event.type}</span>
        </div>
        <span className="text-xs font-mono text-slate-500 flex-shrink-0">{formatTime(event.timestamp)}</span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-mono text-slate-400">{event.source.countryCode}</span>
        <span className="text-cyber-cyan/60 text-xs">→</span>
        <span className="text-xs font-mono text-slate-300">{event.target.countryCode}</span>
        <span className="mx-1 text-slate-600">·</span>
        <span className="text-xs font-mono text-cyber-violet">{event.protocol}</span>
        <span className="mx-1 text-slate-600">·</span>
        <span className="text-xs font-mono text-slate-500">{event.confidence}% conf</span>
      </div>

      {/* Signature */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500 truncate">{event.signature}</span>
        {event.ioc && (
          <span className="text-xs font-mono text-cyber-cyan/60 truncate ml-2 max-w-[100px]">{event.ioc}</span>
        )}
      </div>
    </motion.div>
  );
}
