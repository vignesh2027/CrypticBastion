import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { AttackArc, ThreatEvent, CountryPressure } from '../../types';

interface ThreatGlobeProps {
  arcs: AttackArc[];
  events: ThreatEvent[];
  pressure: CountryPressure[];
  onEventClick?: (event: ThreatEvent) => void;
}

const SEVERITY_COLORS = {
  low: '#3b82f6',
  medium: '#eab308',
  elevated: '#f97316',
  critical: '#ef4444',
};

export default function ThreatGlobe({ arcs, events, pressure, onEventClick: _onEventClick }: ThreatGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState({ attacks: 0, countries: 0, critical: 0 });

  // Derive stats
  useEffect(() => {
    const countries = new Set([...events.map(e => e.source.countryCode), ...events.map(e => e.target.countryCode)]);
    setStats({
      attacks: events.length,
      countries: countries.size,
      critical: events.filter(e => e.severity === 'critical').length,
    });
  }, [events]);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    import('globe.gl').then(({ default: GlobeFactory }) => {
      if (destroyed || !containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Globe = GlobeFactory as any;
      const globe = new Globe(containerRef.current);

      globe
        .width(containerRef.current.clientWidth)
        .height(containerRef.current.clientHeight)
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
        .atmosphereColor('#06b6d4')
        .atmosphereAltitude(0.18)
        .showAtmosphere(true)
        // Attack arcs
        .arcsData([])
        .arcStartLat((d: object) => (d as AttackArc).startLat)
        .arcStartLng((d: object) => (d as AttackArc).startLng)
        .arcEndLat((d: object) => (d as AttackArc).endLat)
        .arcEndLng((d: object) => (d as AttackArc).endLng)
        .arcColor((d: object) => {
          const arc = d as AttackArc;
          const color = SEVERITY_COLORS[arc.severity];
          return [color + '20', color + 'dd', color + '10'];
        })
        .arcAltitude(0.25)
        .arcStroke((d: object) => {
          const arc = d as AttackArc;
          return arc.severity === 'critical' ? 0.8 : arc.severity === 'elevated' ? 0.5 : 0.3;
        })
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(1800)
        // Rings for critical events
        .ringsData([])
        .ringColor(() => (t: number) => `rgba(239,68,68,${1 - t})`)
        .ringMaxRadius(4)
        .ringPropagationSpeed(1.5)
        .ringRepeatPeriod(1200)
        // Labels for active targets
        .labelsData([])
        .labelLat((d: object) => (d as CountryPressure).lat)
        .labelLng((d: object) => (d as CountryPressure).lng)
        .labelText((d: object) => (d as CountryPressure).countryCode)
        .labelSize(0.6)
        .labelColor((d: object) => {
          const p = d as CountryPressure;
          if (p.status === 'under-attack') return '#ef4444';
          if (p.status === 'critical') return '#f97316';
          return '#06b6d480';
        })
        .labelResolution(2);

      // Auto-rotate
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.3;
      globe.controls().enableDamping = true;

      // Point camera at Atlantic
      globe.pointOfView({ lat: 20, lng: -20, altitude: 2.2 });

      globeRef.current = globe;
      setReady(true);

      // Resize handler
      const handleResize = () => {
        if (containerRef.current && globeRef.current) {
          globeRef.current.width(containerRef.current.clientWidth);
          globeRef.current.height(containerRef.current.clientHeight);
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    });

    return () => {
      destroyed = true;
      if (globeRef.current) {
        try { globeRef.current._destructor?.(); } catch {}
        globeRef.current = null;
      }
    };
  }, []);

  // Update arcs
  useEffect(() => {
    if (!globeRef.current) return;
    const visible = arcs.slice(-60);
    globeRef.current.arcsData(visible);
  }, [arcs]);

  // Update rings for critical
  useEffect(() => {
    if (!globeRef.current) return;
    const criticalEvents = events.filter(e => e.severity === 'critical').slice(-10);
    const rings = criticalEvents.map(e => ({
      lat: e.target.lat,
      lng: e.target.lng,
      maxR: 4,
      propagationSpeed: 2,
      repeatPeriod: 1000,
    }));
    globeRef.current.ringsData(rings);
  }, [events]);

  // Update labels
  useEffect(() => {
    if (!globeRef.current) return;
    const hotspots = pressure.filter(p => p.status !== 'calm').slice(0, 15);
    globeRef.current.labelsData(hotspots);
  }, [pressure]);

  return (
    <div className="relative w-full h-full bg-cyber-black overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-950/20 via-transparent to-transparent pointer-events-none" />

      {/* Globe canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading state */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-cyber-cyan font-mono text-sm animate-pulse">INITIALIZING THREAT NEXUS...</p>
          </div>
        </div>
      )}

      {/* Top stats bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-6 glass px-6 py-2 rounded-full border border-cyber-cyan/20"
      >
        <Stat label="ACTIVE THREATS" value={stats.attacks} color="text-cyber-cyan" />
        <div className="w-px bg-cyber-border" />
        <Stat label="NATIONS" value={stats.countries} color="text-cyber-blue" />
        <div className="w-px bg-cyber-border" />
        <Stat label="CRITICAL" value={stats.critical} color="text-cyber-red" />
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-6 right-6 glass p-3 rounded-lg border border-cyber-border space-y-1.5"
      >
        {(Object.entries(SEVERITY_COLORS) as [string, string][]).map(([sev, color]) => (
          <div key={sev} className="flex items-center gap-2">
            <div className="w-4 h-0.5 rounded" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-xs font-mono uppercase text-slate-400">{sev}</span>
          </div>
        ))}
      </motion.div>

      {/* Live indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyber-red animate-pulse-fast" />
        <span className="text-xs font-mono text-cyber-red tracking-widest">LIVE</span>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-mono font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-slate-500 font-mono tracking-wider">{label}</p>
    </div>
  );
}
