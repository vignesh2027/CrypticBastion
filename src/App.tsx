import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Layout/Navbar';
import ThreatGlobe from './components/Globe/ThreatGlobe';
import ThreatFeed from './components/ThreatStream/ThreatFeed';
import ProtocolObservatory from './components/Protocol/ProtocolObservatory';
import InfraGrid from './components/Infrastructure/InfraGrid';
import ReplaySystem from './components/Replay/ReplaySystem';
import HeatwaveSystem from './components/Heatwave/HeatwaveSystem';
import { wsEngine } from './services/websocket';
import { fetchOTXPulses } from './services/otx';
import { generateAttackArc, generateCountryPressure } from './services/mockTelemetry';
import { pushThreatEvent } from './services/firebase';
import type { ThreatEvent, AttackArc, ProtocolMetric, InfraNode, CountryPressure, ActiveView } from './types';

const MAX_EVENTS = 200;
const MAX_ARCS = 80;

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('globe');
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [arcs, setArcs] = useState<AttackArc[]>([]);
  const [protocols, setProtocols] = useState<ProtocolMetric[]>([]);
  const [nodes, setNodes] = useState<InfraNode[]>([]);
  const [pressure, setPressure] = useState<CountryPressure[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ThreatEvent | null>(null);
  const [wsStatus, setWsStatus] = useState<'live' | 'connecting' | 'offline'>('connecting');
  const otxFetched = useRef(false);

  useEffect(() => {
    wsEngine.start();
    setWsStatus('live');

    const unsubThreat = wsEngine.onThreat((event) => {
      setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS));
      setArcs(prev => [generateAttackArc(event), ...prev].slice(0, MAX_ARCS));
      pushThreatEvent(event);
    });

    const unsubProtocol = wsEngine.onProtocol((metrics) => setProtocols(metrics));
    const unsubInfra = wsEngine.onInfra((infraNodes) => setNodes(infraNodes));

    return () => {
      wsEngine.stop();
      unsubThreat();
      unsubProtocol();
      unsubInfra();
    };
  }, []);

  useEffect(() => {
    if (otxFetched.current) return;
    otxFetched.current = true;
    fetchOTXPulses(1).then(otxEvents => {
      if (otxEvents.length) {
        setEvents(prev => [...otxEvents, ...prev].slice(0, MAX_EVENTS));
        setArcs(prev => [...otxEvents.map(generateAttackArc), ...prev].slice(0, MAX_ARCS));
      }
    });
  }, []);

  useEffect(() => {
    const p = generateCountryPressure(events.slice(0, 100));
    setPressure(p);
  }, [events]);

  const criticalCount = events.filter(e => e.severity === 'critical').length;

  return (
    <div className="w-full h-full bg-cyber-black flex flex-col overflow-hidden scanlines bg-cyber-grid">
      <Navbar
        activeView={activeView}
        onViewChange={setActiveView}
        threatCount={events.length}
        criticalCount={criticalCount}
        wsStatus={wsStatus}
      />

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">

          {activeView === 'globe' && (
            <motion.div key="globe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }} className="absolute inset-0 flex gap-3 p-3">
              <div className="flex-1 rounded-xl overflow-hidden border border-cyber-border">
                <ThreatGlobe arcs={arcs} events={events} pressure={pressure} onEventClick={setSelectedEvent} />
              </div>
              <div className="w-80 flex-shrink-0">
                <ThreatFeed events={events} onSelect={setSelectedEvent} selected={selectedEvent} />
              </div>
            </motion.div>
          )}

          {activeView === 'threatstream' && (
            <motion.div key="threatstream" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 p-3 flex gap-3">
              <div className="flex-1">
                <ThreatFeed events={events} onSelect={setSelectedEvent} selected={selectedEvent} />
              </div>
              {selectedEvent && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="w-80 flex-shrink-0 glass rounded-xl border border-cyber-border p-4 overflow-y-auto">
                  <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                </motion.div>
              )}
            </motion.div>
          )}

          {activeView === 'protocol' && (
            <motion.div key="protocol" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="absolute inset-0 p-3">
              <ProtocolObservatory metrics={protocols} />
            </motion.div>
          )}

          {activeView === 'infra' && (
            <motion.div key="infra" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="absolute inset-0 p-3">
              <InfraGrid nodes={nodes} />
            </motion.div>
          )}

          {activeView === 'replay' && (
            <motion.div key="replay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 p-3 flex gap-3">
              <div className="w-96 flex-shrink-0">
                <ReplaySystem history={events} />
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-cyber-border">
                <ThreatGlobe arcs={arcs.slice(-20)} events={events.slice(-20)} pressure={pressure} />
              </div>
            </motion.div>
          )}

          {activeView === 'heatwave' && (
            <motion.div key="heatwave" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 p-3 flex gap-3">
              <div className="w-96 flex-shrink-0">
                <HeatwaveSystem pressure={pressure} />
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border border-cyber-border">
                <ThreatGlobe arcs={arcs} events={events} pressure={pressure} />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <StatusBar events={events} protocols={protocols} />
    </div>
  );
}

function StatusBar({ events, protocols }: { events: ThreatEvent[]; protocols: ProtocolMetric[] }) {
  const [time, setTime] = useState(new Date().toISOString().replace('T', ' ').slice(0, 19));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toISOString().replace('T', ' ').slice(0, 19)), 1000);
    return () => clearInterval(t);
  }, []);

  const topAnomaly = protocols.reduce<ProtocolMetric | null>(
    (max, p) => (!max || p.anomalyPct > max.anomalyPct) ? p : max, null
  );

  const ticker = events.slice(0, 10)
    .map(e => `[${e.severity.toUpperCase()}] ${e.type} ${e.source.countryCode}→${e.target.countryCode} (${e.protocol})`)
    .join('   ///   ');

  return (
    <div className="flex-shrink-0 h-7 bg-cyber-panel border-t border-cyber-border flex items-center px-4 gap-6 overflow-hidden">
      <span className="text-[10px] font-mono text-slate-600 hidden md:block flex-shrink-0">{time} UTC</span>
      <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
        EVENTS: <span className="text-cyber-cyan">{events.length}</span>
      </span>
      {topAnomaly && topAnomaly.anomalyPct > 5 && (
        <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
          ANOMALY: <span className={topAnomaly.anomalyPct > 30 ? 'text-red-400' : 'text-orange-400'}>
            {topAnomaly.protocol} {topAnomaly.anomalyPct.toFixed(1)}%
          </span>
        </span>
      )}
      <div className="flex-1 overflow-hidden">
        {ticker && (
          <motion.span
            key={events[0]?.id}
            initial={{ x: '100%' }}
            animate={{ x: '-200%' }}
            transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
            className="text-[10px] font-mono text-slate-600 inline-block whitespace-nowrap"
          >
            {ticker}
          </motion.span>
        )}
      </div>
      <span className="text-[10px] font-mono text-slate-700 flex-shrink-0">v1.0.0</span>
    </div>
  );
}

function EventDetail({ event, onClose }: { event: ThreatEvent; onClose: () => void }) {
  const colors = { low: 'text-blue-400', medium: 'text-yellow-400', elevated: 'text-orange-400', critical: 'text-red-400' };
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-mono font-bold uppercase ${colors[event.severity]}`}>{event.severity}</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
      </div>
      <h3 className="text-white font-mono font-bold mb-3">{event.type}</h3>
      <div className="space-y-2 text-xs font-mono">
        {[
          ['TIME', new Date(event.timestamp).toISOString().replace('T', ' ').slice(0, 19)],
          ['SOURCE', `${event.source.country} (${event.source.countryCode})`],
          ['TARGET', `${event.target.country} (${event.target.countryCode})`],
          ['PROTOCOL', event.protocol],
          ['SIGNATURE', event.signature],
          ['CONFIDENCE', `${event.confidence}%`],
          ...(event.ioc ? [['IOC', event.ioc]] : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <span className="text-slate-500 flex-shrink-0">{label}</span>
            <span className="text-slate-300 text-right truncate">{value}</span>
          </div>
        ))}
        <div className="border-t border-cyber-border pt-2 mt-2">
          <p className="text-slate-500 text-[10px] mb-1">DESCRIPTION</p>
          <p className="text-slate-300 leading-relaxed">{event.description}</p>
        </div>
      </div>
    </div>
  );
}
