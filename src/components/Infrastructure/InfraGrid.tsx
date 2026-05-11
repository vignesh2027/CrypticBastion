import { motion } from 'framer-motion';
import type { InfraNode, NodeStatus } from '../../types';

interface InfraGridProps {
  nodes: InfraNode[];
}

const STATUS_CONFIG: Record<NodeStatus, { color: string; bg: string; border: string; text: string; ring: string }> = {
  healthy: { color: '#22c55e', bg: 'bg-green-950/30', border: 'border-green-500/30', text: 'text-green-400', ring: 'ring-green-500/20' },
  elevated: { color: '#eab308', bg: 'bg-yellow-950/30', border: 'border-yellow-500/30', text: 'text-yellow-400', ring: 'ring-yellow-500/20' },
  degraded: { color: '#f97316', bg: 'bg-orange-950/30', border: 'border-orange-500/30', text: 'text-orange-400', ring: 'ring-orange-500/20' },
  critical: { color: '#ef4444', bg: 'bg-red-950/30', border: 'border-red-500/30', text: 'text-red-400', ring: 'ring-red-500/20' },
};

function Gauge({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#1f2937" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
          style={{ filter: `drop-shadow(0 0 4px ${color}80)`, transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="18" y="22" textAnchor="middle" fontSize="8" fill={color} fontFamily="monospace">{value}</text>
      </svg>
      <span className="text-[9px] font-mono text-slate-500 uppercase">{label}</span>
    </div>
  );
}

function NodeCard({ node }: { node: InfraNode }) {
  const cfg = STATUS_CONFIG[node.status];
  return (
    <motion.div
      layout
      className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border} ring-1 ${cfg.ring} transition-all duration-500`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Top */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: cfg.color,
                boxShadow: `0 0 6px ${cfg.color}`,
                animation: node.status === 'critical' ? 'pulse 0.8s infinite' : 'pulse 3s infinite',
              }}
            />
            <span className="font-mono text-xs font-bold text-white truncate">{node.name}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{node.region}</span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${cfg.text} ${cfg.border} uppercase`}>
          {node.status}
        </span>
      </div>

      {/* Gauges */}
      <div className="flex justify-around mb-3">
        <Gauge value={node.cpu} color={node.cpu > 85 ? '#ef4444' : '#06b6d4'} label="CPU" />
        <Gauge value={node.memory} color={node.memory > 85 ? '#ef4444' : '#8b5cf6'} label="MEM" />
        <Gauge value={Math.min(100, Math.round(node.latency / 1.2))} color={node.latency > 80 ? '#f97316' : '#22c55e'} label="LAT" />
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-1 text-center border-t border-slate-800/50 pt-2">
        <Metric label="LATENCY" value={`${node.latency}ms`} />
        <Metric label="UPTIME" value={`${node.uptime.toFixed(2)}%`} />
        <Metric label="CONNS" value={node.connections.toLocaleString()} />
      </div>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-mono text-slate-500 uppercase">{label}</p>
      <p className="text-xs font-mono text-slate-300">{value}</p>
    </div>
  );
}

export default function InfraGrid({ nodes }: InfraGridProps) {
  const statusCounts = nodes.reduce<Record<NodeStatus, number>>(
    (acc, n) => { acc[n.status]++; return acc; },
    { healthy: 0, elevated: 0, degraded: 0, critical: 0 }
  );

  return (
    <div className="flex flex-col h-full glass rounded-xl border border-cyber-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
          <span className="text-cyber-green font-mono text-sm font-semibold tracking-wider">SENTINEL INFRA GRID</span>
        </div>
        <div className="flex gap-3 text-xs font-mono">
          <span className="text-green-400">{statusCounts.healthy} healthy</span>
          <span className="text-yellow-400">{statusCounts.elevated} elevated</span>
          <span className="text-orange-400">{statusCounts.degraded} degraded</span>
          <span className="text-red-400">{statusCounts.critical} critical</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
        {nodes.map(node => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
