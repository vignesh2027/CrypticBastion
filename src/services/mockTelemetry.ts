import type { ThreatEvent, AttackArc, ProtocolMetric, InfraNode, CountryPressure, Severity, Protocol, NodeStatus } from '../types';

const COUNTRIES: { country: string; code: string; lat: number; lng: number }[] = [
  { country: 'United States', code: 'US', lat: 37.09, lng: -95.71 },
  { country: 'China', code: 'CN', lat: 35.86, lng: 104.19 },
  { country: 'Russia', code: 'RU', lat: 61.52, lng: 105.31 },
  { country: 'Germany', code: 'DE', lat: 51.16, lng: 10.45 },
  { country: 'Brazil', code: 'BR', lat: -14.23, lng: -51.92 },
  { country: 'India', code: 'IN', lat: 20.59, lng: 78.96 },
  { country: 'United Kingdom', code: 'GB', lat: 55.37, lng: -3.43 },
  { country: 'Netherlands', code: 'NL', lat: 52.13, lng: 5.29 },
  { country: 'Ukraine', code: 'UA', lat: 48.37, lng: 31.16 },
  { country: 'South Korea', code: 'KR', lat: 35.90, lng: 127.76 },
  { country: 'Iran', code: 'IR', lat: 32.42, lng: 53.68 },
  { country: 'Japan', code: 'JP', lat: 36.20, lng: 138.25 },
  { country: 'France', code: 'FR', lat: 46.22, lng: 2.21 },
  { country: 'Canada', code: 'CA', lat: 56.13, lng: -106.34 },
  { country: 'Australia', code: 'AU', lat: -25.27, lng: 133.77 },
  { country: 'Singapore', code: 'SG', lat: 1.35, lng: 103.81 },
  { country: 'North Korea', code: 'KP', lat: 40.33, lng: 127.51 },
  { country: 'Romania', code: 'RO', lat: 45.94, lng: 24.96 },
  { country: 'Nigeria', code: 'NG', lat: 9.08, lng: 8.67 },
  { country: 'Turkey', code: 'TR', lat: 38.96, lng: 35.24 },
];

const ATTACK_TYPES = [
  'Brute Force', 'DDoS', 'Port Scan', 'SQL Injection', 'XSS Attack',
  'Credential Stuffing', 'Malware C2', 'DNS Tunneling', 'Phishing',
  'Ransomware Beacon', 'Botnet Activity', 'Zero-Day Exploit', 'MITM',
  'Lateral Movement', 'Data Exfiltration',
];

const PROTOCOLS: Protocol[] = ['TCP', 'UDP', 'DNS', 'HTTPS', 'SSH', 'ICMP', 'SMTP', 'FTP'];

const SIGNATURES = [
  'ET.SCAN.NMAP', 'SURICATA.HTTP.ANOMALY', 'SNORT.EXPLOIT.BUFFER',
  'CIS.THREAT.APT28', 'MITRE.T1595', 'CVE-2024-1234', 'YARA.RANSOMWARE.v3',
  'ET.MALWARE.COBALTSTRIKE', 'SNORT.DNS.TUNNEL', 'ET.CREDS.SPRAY',
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSeverity(): Severity {
  const r = Math.random();
  if (r < 0.45) return 'low';
  if (r < 0.75) return 'medium';
  if (r < 0.92) return 'elevated';
  return 'critical';
}

export function generateThreatEvent(): ThreatEvent {
  const src = pickRandom(COUNTRIES);
  let dst = pickRandom(COUNTRIES);
  while (dst.code === src.code) dst = pickRandom(COUNTRIES);
  const sev = pickSeverity();

  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    severity: sev,
    source: { lat: src.lat + randFloat(-2, 2), lng: src.lng + randFloat(-2, 2), country: src.country, countryCode: src.code },
    target: { lat: dst.lat + randFloat(-2, 2), lng: dst.lng + randFloat(-2, 2), country: dst.country, countryCode: dst.code },
    protocol: pickRandom(PROTOCOLS),
    type: pickRandom(ATTACK_TYPES),
    signature: pickRandom(SIGNATURES),
    confidence: randInt(55, 99),
    description: `${pickRandom(ATTACK_TYPES)} detected from ${src.country} targeting ${dst.country} infrastructure`,
    ioc: `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
    ttl: randInt(30, 300),
  };
}

export function generateAttackArc(event: ThreatEvent): AttackArc {
  return {
    id: event.id,
    startLat: event.source.lat,
    startLng: event.source.lng,
    endLat: event.target.lat,
    endLng: event.target.lng,
    severity: event.severity,
    timestamp: event.timestamp,
    label: `${event.source.countryCode} → ${event.target.countryCode}`,
  };
}

let protocolBases = {
  TCP: 8500, UDP: 4200, DNS: 2100, HTTPS: 9800, SSH: 320, ICMP: 1100, SMTP: 780, FTP: 210,
};

const PROTOCOL_COLORS: Record<Protocol, string> = {
  TCP: '#06b6d4', UDP: '#8b5cf6', DNS: '#f97316', HTTPS: '#22c55e',
  SSH: '#eab308', ICMP: '#f87171', SMTP: '#60a5fa', FTP: '#a78bfa',
};

export function generateProtocolMetrics(prevMetrics?: ProtocolMetric[]): ProtocolMetric[] {
  return PROTOCOLS.map((proto, i) => {
    const prev = prevMetrics?.[i];
    const base = protocolBases[proto];
    const spike = Math.random() < 0.05 ? randFloat(1.5, 3.5) : 1;
    const throughput = Math.round(base * randFloat(0.85, 1.2) * spike);
    const anomalyPct = spike > 1 ? randFloat(15, 75) : randFloat(0, 12);
    const history = prev?.history
      ? [...prev.history.slice(-59), { time: Date.now(), value: throughput }]
      : Array.from({ length: 30 }, (_, k) => ({ time: Date.now() - (30 - k) * 2000, value: Math.round(base * randFloat(0.8, 1.1)) }));

    return {
      protocol: proto,
      throughput,
      anomalyPct: Math.round(anomalyPct * 10) / 10,
      packetRate: Math.round(throughput * randFloat(0.4, 0.8)),
      history,
      color: PROTOCOL_COLORS[proto],
    };
  });
}

const NODE_REGIONS = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2', 'ap-northeast-1', 'sa-east-1', 'eu-central-1', 'us-central-1'];

export function generateInfraNodes(prev?: InfraNode[]): InfraNode[] {
  if (prev) {
    return prev.map(node => {
      const cpuDelta = randFloat(-5, 5);
      const memDelta = randFloat(-3, 3);
      const newCpu = Math.max(5, Math.min(99, node.cpu + cpuDelta));
      const newMem = Math.max(20, Math.min(98, node.memory + memDelta));
      const status: NodeStatus = newCpu > 90 || newMem > 90 ? 'critical' : newCpu > 75 || newMem > 75 ? 'degraded' : newCpu > 60 ? 'elevated' : 'healthy';
      return { ...node, cpu: Math.round(newCpu), memory: Math.round(newMem), latency: Math.round(randFloat(5, 120)), throughput: Math.round(randFloat(100, 1000)), status };
    });
  }

  return NODE_REGIONS.map((region, i) => {
    const cpu = randInt(15, 85);
    const mem = randInt(30, 80);
    const status: NodeStatus = cpu > 90 ? 'critical' : cpu > 75 ? 'degraded' : cpu > 60 ? 'elevated' : 'healthy';
    return {
      id: `node-${region}`,
      name: `BASTION-${region.toUpperCase()}`,
      region,
      lat: COUNTRIES[i % COUNTRIES.length].lat,
      lng: COUNTRIES[i % COUNTRIES.length].lng,
      status,
      cpu,
      memory: mem,
      latency: randInt(5, 120),
      throughput: randInt(100, 1000),
      uptime: randFloat(99.1, 99.99),
      connections: randInt(200, 5000),
    };
  });
}

export function generateCountryPressure(events: ThreatEvent[]): CountryPressure[] {
  const pressureMap: Record<string, { count: number; severity: number }> = {};

  for (const e of events) {
    const key = e.target.countryCode;
    if (!pressureMap[key]) pressureMap[key] = { count: 0, severity: 0 };
    pressureMap[key].count++;
    pressureMap[key].severity += e.severity === 'critical' ? 4 : e.severity === 'elevated' ? 3 : e.severity === 'medium' ? 2 : 1;
  }

  return COUNTRIES.map(c => {
    const p = pressureMap[c.code];
    const pressure = p ? Math.min(100, (p.severity / 4) * 20) : Math.random() * 10;
    const status = pressure > 80 ? 'under-attack' : pressure > 60 ? 'critical' : pressure > 40 ? 'high-risk' : pressure > 20 ? 'elevated' : 'calm';
    return {
      countryCode: c.code,
      country: c.country,
      lat: c.lat,
      lng: c.lng,
      pressure: Math.round(pressure),
      attackCount: p?.count ?? 0,
      status,
    };
  });
}
