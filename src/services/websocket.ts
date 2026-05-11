import type { ThreatEvent, ProtocolMetric, InfraNode } from '../types';
import { generateThreatEvent, generateProtocolMetrics, generateInfraNodes } from './mockTelemetry';

type WSEventType = 'threat' | 'protocol' | 'infra' | 'heartbeat';

interface WSMessage {
  type: WSEventType;
  payload: ThreatEvent | ProtocolMetric[] | InfraNode[] | { ts: number };
  timestamp: number;
}

type Listener<T> = (data: T) => void;

class CrypticBastionWSEngine {
  private threatListeners: Listener<ThreatEvent>[] = [];
  private protocolListeners: Listener<ProtocolMetric[]>[] = [];
  private infraListeners: Listener<InfraNode[]>[] = [];

  private threatInterval: ReturnType<typeof setInterval> | null = null;
  private protocolInterval: ReturnType<typeof setInterval> | null = null;
  private infraInterval: ReturnType<typeof setInterval> | null = null;

  private currentProtocol: ProtocolMetric[] = [];
  private currentInfra: InfraNode[] = [];
  private running = false;

  start() {
    if (this.running) return;
    this.running = true;

    this.currentProtocol = generateProtocolMetrics();
    this.currentInfra = generateInfraNodes();

    // Threat events every 1.5-3s
    const scheduleThreat = () => {
      const delay = 1500 + Math.random() * 1500;
      this.threatInterval = setTimeout(() => {
        if (!this.running) return;
        const event = generateThreatEvent();
        this.threatListeners.forEach(l => l(event));
        scheduleThreat();
      }, delay) as unknown as ReturnType<typeof setInterval>;
    };
    scheduleThreat();

    // Protocol metrics every 2s
    this.protocolInterval = setInterval(() => {
      if (!this.running) return;
      this.currentProtocol = generateProtocolMetrics(this.currentProtocol);
      this.protocolListeners.forEach(l => l(this.currentProtocol));
    }, 2000);

    // Infra metrics every 5s
    this.infraInterval = setInterval(() => {
      if (!this.running) return;
      this.currentInfra = generateInfraNodes(this.currentInfra);
      this.infraListeners.forEach(l => l(this.currentInfra));
    }, 5000);

    // Emit initial state immediately
    setTimeout(() => {
      this.protocolListeners.forEach(l => l(this.currentProtocol));
      this.infraListeners.forEach(l => l(this.currentInfra));
    }, 100);
  }

  stop() {
    this.running = false;
    if (this.threatInterval) clearTimeout(this.threatInterval as unknown as ReturnType<typeof setTimeout>);
    if (this.protocolInterval) clearInterval(this.protocolInterval);
    if (this.infraInterval) clearInterval(this.infraInterval);
  }

  onThreat(cb: Listener<ThreatEvent>) {
    this.threatListeners.push(cb);
    return () => { this.threatListeners = this.threatListeners.filter(l => l !== cb); };
  }

  onProtocol(cb: Listener<ProtocolMetric[]>) {
    this.protocolListeners.push(cb);
    return () => { this.protocolListeners = this.protocolListeners.filter(l => l !== cb); };
  }

  onInfra(cb: Listener<InfraNode[]>) {
    this.infraListeners.push(cb);
    return () => { this.infraListeners = this.infraListeners.filter(l => l !== cb); };
  }

  getCurrentProtocol() { return this.currentProtocol; }
  getCurrentInfra() { return this.currentInfra; }
  isRunning() { return this.running; }
}

export const wsEngine = new CrypticBastionWSEngine();

export type { WSMessage, WSEventType };
