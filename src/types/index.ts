export type Severity = 'low' | 'medium' | 'elevated' | 'critical';

export type NodeStatus = 'healthy' | 'elevated' | 'degraded' | 'critical';

export type Protocol = 'TCP' | 'UDP' | 'DNS' | 'HTTPS' | 'SSH' | 'ICMP' | 'SMTP' | 'FTP';

export interface GeoCoords {
  lat: number;
  lng: number;
  country: string;
  countryCode: string;
  city?: string;
}

export interface ThreatEvent {
  id: string;
  timestamp: number;
  severity: Severity;
  source: GeoCoords;
  target: GeoCoords;
  protocol: Protocol;
  type: string;
  signature: string;
  confidence: number;
  description: string;
  ioc?: string;
  ttl?: number;
}

export interface AttackArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  severity: Severity;
  timestamp: number;
  label?: string;
}

export interface ProtocolMetric {
  protocol: Protocol;
  throughput: number;
  anomalyPct: number;
  packetRate: number;
  history: { time: number; value: number }[];
  color: string;
}

export interface InfraNode {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  status: NodeStatus;
  cpu: number;
  memory: number;
  latency: number;
  throughput: number;
  uptime: number;
  connections: number;
}

export interface ReplayEvent {
  id: string;
  timestamp: number;
  type: 'attack' | 'anomaly' | 'infra' | 'protocol';
  data: ThreatEvent | ProtocolMetric | InfraNode;
}

export interface CountryPressure {
  countryCode: string;
  country: string;
  lat: number;
  lng: number;
  pressure: number;
  attackCount: number;
  status: 'calm' | 'elevated' | 'high-risk' | 'critical' | 'under-attack';
}

export interface TelemetrySnapshot {
  timestamp: number;
  activeThreatCount: number;
  globalPressureIndex: number;
  topAttackedCountry: string;
  topSourceCountry: string;
  criticalEventCount: number;
  protocolAnomalyCount: number;
}

export interface OTXPulse {
  id: string;
  name: string;
  description: string;
  tags: string[];
  indicators: OTXIndicator[];
  created: string;
  modified: string;
  tlp: string;
}

export interface OTXIndicator {
  id: number;
  indicator: string;
  type: string;
  description?: string;
  country_code?: string;
}

export type ReplayMode = '5min' | '1hour' | '24hour';

export type ActiveView = 'globe' | 'threatstream' | 'protocol' | 'infra' | 'replay' | 'heatwave';
