import type { ThreatEvent, Severity, Protocol } from '../types';
import { generateThreatEvent } from './mockTelemetry';

const OTX_BASE = 'https://otx.alienvault.com/api/v1';
const API_KEY = import.meta.env.VITE_OTX_API_KEY as string;

const HEADERS = { 'X-OTX-API-KEY': API_KEY };

interface OTXPulseResponse {
  results: OTXPulse[];
  count: number;
  next: string | null;
}

interface OTXPulse {
  id: string;
  name: string;
  description: string;
  tags: string[];
  indicators: OTXIndicator[];
  created: string;
  modified: string;
  targeted_countries: string[];
  industries: string[];
  malware_families: string[];
  attack_ids: { id: string; name: string; display_name: string }[];
}

interface OTXIndicator {
  id: number;
  indicator: string;
  type: string;
  description?: string;
  country_code?: string;
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  US: { lat: 37.09, lng: -95.71, name: 'United States' },
  CN: { lat: 35.86, lng: 104.19, name: 'China' },
  RU: { lat: 61.52, lng: 105.31, name: 'Russia' },
  DE: { lat: 51.16, lng: 10.45, name: 'Germany' },
  BR: { lat: -14.23, lng: -51.92, name: 'Brazil' },
  IN: { lat: 20.59, lng: 78.96, name: 'India' },
  GB: { lat: 55.37, lng: -3.43, name: 'United Kingdom' },
  NL: { lat: 52.13, lng: 5.29, name: 'Netherlands' },
  UA: { lat: 48.37, lng: 31.16, name: 'Ukraine' },
  KR: { lat: 35.90, lng: 127.76, name: 'South Korea' },
  IR: { lat: 32.42, lng: 53.68, name: 'Iran' },
  JP: { lat: 36.20, lng: 138.25, name: 'Japan' },
  FR: { lat: 46.22, lng: 2.21, name: 'France' },
  CA: { lat: 56.13, lng: -106.34, name: 'Canada' },
  AU: { lat: -25.27, lng: 133.77, name: 'Australia' },
  SG: { lat: 1.35, lng: 103.81, name: 'Singapore' },
  TR: { lat: 38.96, lng: 35.24, name: 'Turkey' },
};

function mapTypeToProtocol(type: string): Protocol {
  const t = type.toLowerCase();
  if (t.includes('dns')) return 'DNS';
  if (t.includes('ssh')) return 'SSH';
  if (t.includes('smtp') || t.includes('email')) return 'SMTP';
  if (t.includes('ftp')) return 'FTP';
  if (t.includes('https') || t.includes('url') || t.includes('domain')) return 'HTTPS';
  if (t.includes('icmp') || t.includes('ping')) return 'ICMP';
  if (t.includes('udp')) return 'UDP';
  return 'TCP';
}

function mapTagsToSeverity(tags: string[], attackIds: { id: string }[]): Severity {
  const combined = [...tags, ...attackIds.map(a => a.id)].join(' ').toLowerCase();
  if (combined.includes('critical') || combined.includes('ransomware') || combined.includes('apt') || combined.includes('zero-day')) return 'critical';
  if (combined.includes('elevated') || combined.includes('high') || combined.includes('exploit')) return 'elevated';
  if (combined.includes('medium') || combined.includes('malware')) return 'medium';
  return 'low';
}

export async function fetchOTXPulses(page = 1): Promise<ThreatEvent[]> {
  try {
    const res = await fetch(`${OTX_BASE}/pulses/subscribed?limit=20&page=${page}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`OTX HTTP ${res.status}`);
    const data: OTXPulseResponse = await res.json();
    const events: ThreatEvent[] = [];

    for (const pulse of data.results) {
      const severity = mapTagsToSeverity(pulse.tags, pulse.attack_ids ?? []);

      const ipIndicators = pulse.indicators.filter(i => i.type === 'IPv4' || i.type === 'IPv6');
      const domainIndicators = pulse.indicators.filter(i => i.type === 'domain' || i.type === 'hostname');
      const allIndicators = [...ipIndicators, ...domainIndicators].slice(0, 3);

      for (const ind of allIndicators) {
        const srcCode = ind.country_code?.toUpperCase() ?? 'US';
        const tgtCode = pulse.targeted_countries?.[0]?.toUpperCase() ?? 'US';
        const src = COUNTRY_COORDS[srcCode] ?? COUNTRY_COORDS['US'];
        const tgt = COUNTRY_COORDS[tgtCode] ?? COUNTRY_COORDS['US'];

        events.push({
          id: `otx-${pulse.id}-${ind.id}`,
          timestamp: new Date(pulse.modified).getTime(),
          severity,
          source: { lat: src.lat, lng: src.lng, country: src.name, countryCode: srcCode },
          target: { lat: tgt.lat, lng: tgt.lng, country: tgt.name, countryCode: tgtCode },
          protocol: mapTypeToProtocol(ind.type),
          type: pulse.malware_families?.[0] ?? pulse.attack_ids?.[0]?.display_name ?? 'Threat Intelligence',
          signature: `OTX.${pulse.id.slice(0, 8).toUpperCase()}`,
          confidence: 75,
          description: pulse.name,
          ioc: ind.indicator,
        });
      }
    }

    return events;
  } catch {
    return Array.from({ length: 5 }, generateThreatEvent);
  }
}

export async function fetchOTXRecentIndicators(): Promise<ThreatEvent[]> {
  try {
    const res = await fetch(`${OTX_BASE}/indicators/export?types=IPv4,domain&limit=50`, { headers: HEADERS });
    if (!res.ok) throw new Error();
    const text = await res.text();
    const lines = text.trim().split('\n').filter(l => l && !l.startsWith('#')).slice(0, 20);

    return lines.map(line => {
      const event = generateThreatEvent();
      const parts = line.split('\t');
      return { ...event, ioc: parts[0] ?? event.ioc, id: `otx-ind-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    });
  } catch {
    return Array.from({ length: 8 }, generateThreatEvent);
  }
}
