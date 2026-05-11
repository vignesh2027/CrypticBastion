import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import type { ThreatEvent } from '../../types';

interface AttackChainTimelineProps {
  events: ThreatEvent[];
  onSelectIP?: (ip: string) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'ip' | 'country' | 'malware' | 'protocol';
  severity: string;
  count: number;
  ioc?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  severity: string;
  protocol: string;
  count: number;
}

const TYPE_COLORS = {
  ip: '#ef4444',
  country: '#06b6d4',
  malware: '#8b5cf6',
  protocol: '#22c55e',
};

const SEVERITY_STROKE = {
  low: '#3b82f6',
  medium: '#eab308',
  elevated: '#f97316',
  critical: '#ef4444',
};

function buildGraph(events: ThreatEvent[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodeMap = new Map<string, GraphNode>();
  const linkMap = new Map<string, GraphLink>();

  const upsertNode = (id: string, label: string, type: GraphNode['type'], severity: string, ioc?: string) => {
    if (nodeMap.has(id)) {
      nodeMap.get(id)!.count++;
    } else {
      nodeMap.set(id, { id, label, type, severity, count: 1, ioc });
    }
  };

  const upsertLink = (src: string, tgt: string, severity: string, protocol: string) => {
    const key = `${src}::${tgt}`;
    if (linkMap.has(key)) {
      linkMap.get(key)!.count++;
    } else {
      linkMap.set(key, { source: src, target: tgt, severity, protocol, count: 1 });
    }
  };

  for (const e of events) {
    const srcId = `country:${e.source.countryCode}`;
    const tgtId = `country:${e.target.countryCode}`;
    const protoId = `proto:${e.protocol}`;
    const malwareId = `malware:${e.type}`;

    upsertNode(srcId, e.source.countryCode, 'country', e.severity);
    upsertNode(tgtId, e.target.countryCode, 'country', e.severity);
    upsertNode(protoId, e.protocol, 'protocol', e.severity);
    upsertNode(malwareId, e.type.slice(0, 12), 'malware', e.severity);

    if (e.ioc) {
      const ipId = `ip:${e.ioc}`;
      upsertNode(ipId, e.ioc, 'ip', e.severity, e.ioc);
      upsertLink(srcId, ipId, e.severity, e.protocol);
      upsertLink(ipId, tgtId, e.severity, e.protocol);
    } else {
      upsertLink(srcId, tgtId, e.severity, e.protocol);
    }

    upsertLink(malwareId, protoId, e.severity, e.protocol);
  }

  // Prune isolated nodes
  const linkedIds = new Set<string>();
  for (const l of linkMap.values()) {
    linkedIds.add(l.source as string);
    linkedIds.add(l.target as string);
  }

  const nodes = [...nodeMap.values()].filter(n => linkedIds.has(n.id));
  const links = [...linkMap.values()];

  return { nodes, links };
}

export default function AttackChainTimeline({ events, onSelectIP }: AttackChainTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [filter, setFilter] = useState<'all' | 'ip' | 'country' | 'malware' | 'protocol'>('all');

  const allGraph = useMemo(() => buildGraph(events.slice(0, 80)), [events]);

  const graph = useMemo(() => {
    if (filter === 'all') return allGraph;
    const nodes = allGraph.nodes.filter(n => n.type === filter || n.type === 'country');
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = allGraph.links.filter(l =>
      nodeIds.has(l.source as string) && nodeIds.has(l.target as string)
    );
    return { nodes, links };
  }, [allGraph, filter]);

  useEffect(() => {
    if (!svgRef.current || !graph.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = svgRef.current.getBoundingClientRect();
    const W = width || 800;
    const H = height || 500;

    svg.attr('width', W).attr('height', H);

    const g = svg.append('g');

    // Zoom
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // Arrowhead marker
    svg.append('defs').selectAll('marker')
      .data(['low', 'medium', 'elevated', 'critical'])
      .join('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 4)
      .attr('markerHeight', 4)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', (d: string) => SEVERITY_STROKE[d as keyof typeof SEVERITY_STROKE]);

    // Deep-clone nodes and links so D3 can mutate them
    const simNodes: GraphNode[] = graph.nodes.map(n => ({ ...n }));
    const idToNode = new Map(simNodes.map(n => [n.id, n]));
    const simLinks: GraphLink[] = graph.links.map(l => ({
      ...l,
      source: idToNode.get(l.source as string) ?? l.source,
      target: idToNode.get(l.target as string) ?? l.target,
    }));

    const sim = d3.forceSimulation<GraphNode>(simNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(simLinks).id(d => d.id).distance(90).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(28));

    // Links
    const link = g.append('g').selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', d => SEVERITY_STROKE[d.severity as keyof typeof SEVERITY_STROKE] ?? '#334155')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', d => Math.min(3, 0.5 + d.count * 0.4))
      .attr('marker-end', d => `url(#arrow-${d.severity})`);

    // Node groups
    const node = g.append('g').selectAll<SVGGElement, GraphNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      )
      .on('click', (_, d) => {
        setSelected(d);
        if (d.type === 'ip' && d.ioc) onSelectIP?.(d.ioc);
      });

    // Pulse ring for critical
    node.filter(d => d.severity === 'critical')
      .append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1)
      .attr('opacity', 0.4)
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', '14;22;14')
      .attr('dur', '1.5s')
      .attr('repeatCount', 'indefinite');

    node.append('circle')
      .attr('r', d => 8 + Math.min(10, d.count * 1.5))
      .attr('fill', d => TYPE_COLORS[d.type] + '20')
      .attr('stroke', d => TYPE_COLORS[d.type])
      .attr('stroke-width', 1.5)
      .style('filter', d => `drop-shadow(0 0 4px ${TYPE_COLORS[d.type]}80)`);

    node.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.type === 'ip' ? 7 : 8)
      .attr('font-family', 'monospace')
      .attr('fill', d => TYPE_COLORS[d.type])
      .text(d => d.label.slice(0, 10));

    // Count badge
    node.filter(d => d.count > 1)
      .append('text')
      .attr('x', 12)
      .attr('y', -10)
      .attr('font-size', 7)
      .attr('font-family', 'monospace')
      .attr('fill', '#94a3b8')
      .text(d => `×${d.count}`);

    sim.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0);
      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { sim.stop(); };
  }, [graph, onSelectIP]);

  return (
    <div className="flex flex-col h-full glass rounded-xl border border-cyber-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-violet animate-pulse" />
          <span className="text-cyber-violet font-mono text-sm font-semibold tracking-wider">ATTACK CHAIN TIMELINE</span>
        </div>
        <span className="text-xs font-mono text-slate-500">{graph.nodes.length} nodes · {graph.links.length} edges</span>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-cyber-border flex-shrink-0">
        <span className="text-xs font-mono text-slate-500 mr-1">FILTER:</span>
        {(['all', 'ip', 'country', 'malware', 'protocol'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors ${
              filter === f
                ? 'border-cyber-cyan text-cyber-cyan bg-cyan-950/30'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
        {/* Legend */}
        <div className="ml-auto flex items-center gap-3">
          {(Object.entries(TYPE_COLORS) as [string, string][]).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] font-mono text-slate-500 uppercase">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative overflow-hidden">
        {graph.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-slate-600 font-mono text-sm">Waiting for threat data...</p>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}

        {/* Node detail */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 left-4 glass border border-cyber-border rounded-lg p-3 w-56"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[selected.type] }} />
                  <span className="text-xs font-mono font-bold uppercase" style={{ color: TYPE_COLORS[selected.type] }}>
                    {selected.type}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 text-sm">×</button>
              </div>
              <p className="text-white font-mono text-sm font-bold mb-1 truncate">{selected.label}</p>
              <p className="text-slate-500 text-xs font-mono">Observed {selected.count}× in chain</p>
              {selected.type === 'ip' && (
                <button
                  onClick={() => onSelectIP?.(selected.ioc!)}
                  className="mt-2 w-full text-xs font-mono text-cyber-cyan border border-cyber-cyan/30 rounded py-1 hover:bg-cyan-950/30 transition-colors"
                >
                  INSPECT IP →
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint */}
        <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-700">
          scroll to zoom · drag nodes · click to inspect
        </div>
      </div>
    </div>
  );
}
