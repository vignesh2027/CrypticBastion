import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import type { ProtocolMetric } from '../../types';

interface ProtocolObservatoryProps {
  metrics: ProtocolMetric[];
}

export default function ProtocolObservatory({ metrics }: ProtocolObservatoryProps) {
  const totalThroughput = metrics.reduce((s, m) => s + m.throughput, 0);
  const avgAnomaly = metrics.length ? metrics.reduce((s, m) => s + m.anomalyPct, 0) / metrics.length : 0;
  const maxAnomaly = metrics.reduce((max, m) => m.anomalyPct > max.anomalyPct ? m : max, metrics[0]);

  return (
    <div className="flex flex-col h-full glass rounded-xl border border-cyber-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-violet animate-pulse" />
          <span className="text-cyber-violet font-mono text-sm font-semibold tracking-wider">PROTOCOL OBSERVATORY</span>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-slate-500">TOTAL: <span className="text-cyber-cyan">{(totalThroughput / 1000).toFixed(1)}k pps</span></span>
          <span className="text-slate-500">AVG ANOM: <span className={avgAnomaly > 20 ? 'text-cyber-red' : 'text-cyber-green'}>{avgAnomaly.toFixed(1)}%</span></span>
        </div>
      </div>

      {/* Alert banner */}
      {maxAnomaly && maxAnomaly.anomalyPct > 25 && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          className="bg-red-950/30 border-b border-red-500/30 px-4 py-1.5 flex-shrink-0"
        >
          <span className="text-xs font-mono text-red-400">
            ⚠ ANOMALY SPIKE: {maxAnomaly.protocol} at {maxAnomaly.anomalyPct.toFixed(1)}%
          </span>
        </motion.div>
      )}

      {/* Protocol grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 gap-3">
        {metrics.map(metric => (
          <ProtocolCard key={metric.protocol} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function ProtocolCard({ metric }: { metric: ProtocolMetric }) {
  const isAnomalous = metric.anomalyPct > 20;
  const isCritical = metric.anomalyPct > 50;

  const chartData = metric.history.slice(-30).map((h, i) => ({ i, v: h.value }));

  return (
    <motion.div
      layout
      className={`
        rounded-lg border p-3 transition-all duration-300
        ${isCritical ? 'bg-red-950/20 border-red-500/30' : isAnomalous ? 'bg-orange-950/20 border-orange-500/30' : 'bg-slate-900/40 border-cyber-border'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: metric.color, boxShadow: `0 0 6px ${metric.color}` }} />
          <span className="font-mono text-sm font-bold text-white">{metric.protocol}</span>
          {isCritical && <span className="text-xs font-mono text-red-400 animate-pulse">SPIKE</span>}
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">{metric.throughput.toLocaleString()} <span className="text-slate-600">pps</span></span>
          <span className={isCritical ? 'text-red-400' : isAnomalous ? 'text-orange-400' : 'text-green-400'}>
            {metric.anomalyPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`grad-${metric.protocol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={metric.color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={metric.color}
              strokeWidth={1.5}
              fill={`url(#grad-${metric.protocol})`}
              dot={false}
              isAnimationActive={false}
            />
            <Tooltip
              contentStyle={{ background: '#0d1117', border: `1px solid ${metric.color}40`, borderRadius: 6, fontSize: 10, fontFamily: 'monospace' }}
              itemStyle={{ color: metric.color }}
              formatter={(v) => [Number(v).toLocaleString(), 'pps']}
              labelFormatter={() => ''}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar */}
      <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: metric.color }}
          animate={{ width: `${Math.min(100, (metric.throughput / 12000) * 100)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}
