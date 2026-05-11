import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ThreatEvent, ReplayMode } from '../../types';

interface ReplaySystemProps {
  history: ThreatEvent[];
}

const MODE_LABELS: Record<ReplayMode, string> = {
  '5min': 'LAST 5 MIN',
  '1hour': 'LAST HOUR',
  '24hour': 'LAST 24H',
};

const MODE_WINDOWS: Record<ReplayMode, number> = {
  '5min': 5 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '24hour': 24 * 60 * 60 * 1000,
};

export default function ReplaySystem({ history }: ReplaySystemProps) {
  const [mode, setMode] = useState<ReplayMode>('5min');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [replayIndex, setReplayIndex] = useState(0);
  const [visibleEvents, setVisibleEvents] = useState<ThreatEvent[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const filteredEvents = history
    .filter(e => e.timestamp > Date.now() - MODE_WINDOWS[mode])
    .sort((a, b) => a.timestamp - b.timestamp);

  const totalEvents = filteredEvents.length;

  useEffect(() => {
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setReplayIndex(prev => {
        const next = prev + speed;
        if (next >= totalEvents) {
          setIsPlaying(false);
          return totalEvents - 1;
        }
        const pct = (next / Math.max(1, totalEvents - 1)) * 100;
        setProgress(pct);
        setVisibleEvents(filteredEvents.slice(0, next + 1).slice(-20));
        return next;
      });
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, totalEvents, filteredEvents]);

  const handlePlay = () => {
    if (replayIndex >= totalEvents - 1) {
      setReplayIndex(0);
      setProgress(0);
      setVisibleEvents([]);
    }
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  const handleReset = () => {
    setIsPlaying(false);
    setReplayIndex(0);
    setProgress(0);
    setVisibleEvents([]);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value);
    const idx = Math.round((pct / 100) * (totalEvents - 1));
    setProgress(pct);
    setReplayIndex(idx);
    setVisibleEvents(filteredEvents.slice(0, idx + 1).slice(-20));
  };

  const currentEvent = filteredEvents[replayIndex];

  return (
    <div className="flex flex-col h-full glass rounded-xl border border-cyber-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyber-red animate-pulse-fast' : 'bg-slate-500'}`} />
          <span className="text-slate-300 font-mono text-sm font-semibold tracking-wider">BASTION REPLAY ENGINE</span>
        </div>
        <span className="text-xs font-mono text-slate-500">{totalEvents} events loaded</span>
      </div>

      {/* Mode selector */}
      <div className="flex border-b border-cyber-border flex-shrink-0">
        {(Object.keys(MODE_LABELS) as ReplayMode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); handleReset(); }}
            className={`flex-1 py-2 text-xs font-mono transition-colors ${
              mode === m ? 'text-cyber-cyan bg-cyan-950/30 border-b-2 border-cyber-cyan' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Current event highlight */}
      <div className="px-4 py-3 border-b border-cyber-border flex-shrink-0 min-h-[72px]">
        <AnimatePresence mode="wait">
          {currentEvent && (
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <SeverityDot severity={currentEvent.severity} />
                <span className="text-sm font-mono text-white font-bold">{currentEvent.type}</span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                {currentEvent.source.country} → {currentEvent.target.country} · {currentEvent.protocol}
              </div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">
                {new Date(currentEvent.timestamp).toISOString().replace('T', ' ').slice(0, 19)} UTC
              </div>
            </motion.div>
          )}
          {!currentEvent && (
            <div className="text-xs font-mono text-slate-600 italic">Press play to begin replay...</div>
          )}
        </AnimatePresence>
      </div>

      {/* Timeline scrubber */}
      <div className="px-4 py-3 border-b border-cyber-border flex-shrink-0">
        <div className="relative mb-2">
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={handleScrub}
            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyber-cyan"
            style={{ background: `linear-gradient(to right, #06b6d4 ${progress}%, #1f2937 ${progress}%)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-600">
          <span>0:00</span>
          <span>{replayIndex}/{totalEvents}</span>
          <span>END</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <ControlBtn onClick={handleReset} title="Reset">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </ControlBtn>
          {isPlaying ? (
            <ControlBtn onClick={handlePause} title="Pause" active>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </ControlBtn>
          ) : (
            <ControlBtn onClick={handlePlay} title="Play">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </ControlBtn>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">SPEED</span>
          {[1, 2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors ${
                speed === s ? 'border-cyber-cyan text-cyber-cyan bg-cyan-950/30' : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Replay event list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <AnimatePresence>
          {[...visibleEvents].reverse().map((e, i) => (
            <motion.div
              key={e.id + i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 py-1.5 border-b border-slate-800/50 last:border-0"
            >
              <SeverityDot severity={e.severity} />
              <span className="text-xs font-mono text-slate-400 flex-1 truncate">{e.type}</span>
              <span className="text-xs font-mono text-slate-600">{e.source.countryCode}→{e.target.countryCode}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SeverityDot({ severity }: { severity: ThreatEvent['severity'] }) {
  const colors = { low: 'bg-blue-400', medium: 'bg-yellow-400', elevated: 'bg-orange-400', critical: 'bg-red-400' };
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[severity]}`} />;
}

function ControlBtn({ onClick, children, title, active }: { onClick: () => void; children: React.ReactNode; title: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${
        active ? 'border-cyber-cyan text-cyber-cyan bg-cyan-950/30' : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
      }`}
    >
      {children}
    </button>
  );
}
