import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IPInspectorProps {
  ip: string | null;
  onClose: () => void;
}

interface GeoData {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  country_code: string;
  org: string;
  asn: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface OTXData {
  reputation: number;
  pulse_count: number;
  malware_families: string[];
  attack_ids: string[];
  country_code: string;
  type_title: string;
}

interface InspectResult {
  geo: GeoData | null;
  otx: OTXData | null;
  error: string | null;
}

const OTX_KEY = import.meta.env.VITE_OTX_API_KEY as string;

async function fetchGeo(ip: string): Promise<GeoData | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchOTX(ip: string): Promise<OTXData | null> {
  try {
    const res = await fetch(
      `https://otx.alienvault.com/api/v1/indicators/IPv4/${ip}/general`,
      { headers: { 'X-OTX-API-KEY': OTX_KEY } }
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    return {
      reputation: data.reputation ?? 0,
      pulse_count: data.pulse_info?.count ?? 0,
      malware_families: (data.malware_families ?? []).slice(0, 5).map((m: { id: string }) => m.id),
      attack_ids: (data.pulse_info?.related?.alienvault?.attack_ids ?? []).slice(0, 4).map((a: { display_name: string }) => a.display_name),
      country_code: data.country_code ?? '',
      type_title: data.type_title ?? 'IPv4',
    };
  } catch {
    return null;
  }
}

function RiskScore({ score }: { score: number }) {
  const level = score >= 7 ? 'CRITICAL' : score >= 4 ? 'HIGH' : score >= 2 ? 'MEDIUM' : 'LOW';
  const color = score >= 7 ? '#ef4444' : score >= 4 ? '#f97316' : score >= 2 ? '#eab308' : '#22c55e';
  const pct = Math.min(100, (score / 10) * 100);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-slate-400">RISK SCORE</span>
        <span className="text-sm font-mono font-bold" style={{ color }}>{level}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, #22c55e, ${color})` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] font-mono text-slate-600">0</span>
        <span className="text-[10px] font-mono" style={{ color }}>{score.toFixed(1)} / 10</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3 py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-[11px] font-mono text-slate-500 flex-shrink-0">{label}</span>
      <span className={`text-[11px] text-right text-slate-300 ${mono ? 'font-mono' : ''} truncate max-w-[180px]`}>{value || '—'}</span>
    </div>
  );
}

function TagList({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <div className="mb-3">
      <p className="text-[10px] font-mono text-slate-500 mb-1.5 uppercase">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map(item => (
          <span key={item} className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
            style={{ color, borderColor: color + '40', background: color + '10' }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function IPInspector({ ip, onClose }: IPInspectorProps) {
  const [result, setResult] = useState<InspectResult>({ geo: null, otx: null, error: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ip) return;
    setLoading(true);
    setResult({ geo: null, otx: null, error: null });

    Promise.all([fetchGeo(ip), fetchOTX(ip)]).then(([geo, otx]) => {
      setResult({ geo, otx, error: null });
      setLoading(false);
    });
  }, [ip]);

  if (!ip) return null;

  const riskScore = result.otx
    ? Math.min(10, (result.otx.reputation < 0 ? Math.abs(result.otx.reputation) / 10 : 0) + result.otx.pulse_count * 0.3)
    : 0;

  const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1|fc|fd)/.test(ip);

  return (
    <AnimatePresence>
      {ip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="glass border border-cyber-border rounded-xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyber-red animate-pulse" />
                <span className="text-cyber-red font-mono text-sm font-bold tracking-wider">IP INSPECTOR</span>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg leading-none">×</button>
            </div>

            {/* IP address */}
            <div className="px-4 pt-4 pb-3 border-b border-cyber-border">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-white font-mono text-xl font-bold tracking-wider">{ip}</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {isPrivate ? '⚠ PRIVATE / RFC1918 ADDRESS' : 'PUBLIC ROUTABLE ADDRESS'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://www.virustotal.com/gui/ip-address/${ip}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono px-2 py-1 rounded border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
                  >
                    VirusTotal ↗
                  </a>
                  <a
                    href={`https://www.abuseipdb.com/check/${ip}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono px-2 py-1 rounded border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
                  >
                    AbuseIPDB ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-8 h-8 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono text-slate-500 animate-pulse">QUERYING THREAT INTEL...</p>
                </div>
              ) : (
                <>
                  {/* Risk score */}
                  {result.otx && <RiskScore score={riskScore} />}

                  {/* OTX Intelligence */}
                  {result.otx && (
                    <div className="mb-4">
                      <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">OTX THREAT INTEL</p>
                      <div className="glass rounded-lg p-3 border border-cyber-border">
                        <InfoRow label="PULSE HITS" value={String(result.otx.pulse_count)} />
                        <InfoRow label="REPUTATION" value={result.otx.reputation < 0 ? `⚠ ${result.otx.reputation} (malicious)` : `${result.otx.reputation} (clean)`} />
                        <InfoRow label="TYPE" value={result.otx.type_title} />
                      </div>
                      <div className="mt-3 space-y-2">
                        <TagList label="Malware Families" items={result.otx.malware_families} color="#ef4444" />
                        <TagList label="Attack Techniques" items={result.otx.attack_ids} color="#8b5cf6" />
                      </div>
                    </div>
                  )}

                  {/* Geo */}
                  {result.geo && (
                    <div className="mb-4">
                      <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">GEOLOCATION</p>
                      <div className="glass rounded-lg p-3 border border-cyber-border">
                        <InfoRow label="CITY" value={result.geo.city} />
                        <InfoRow label="REGION" value={result.geo.region} />
                        <InfoRow label="COUNTRY" value={`${result.geo.country_name} (${result.geo.country_code})`} />
                        <InfoRow label="ORG / ISP" value={result.geo.org} />
                        <InfoRow label="ASN" value={result.geo.asn} />
                        <InfoRow label="TIMEZONE" value={result.geo.timezone} />
                        <InfoRow label="COORDS" value={`${result.geo.latitude?.toFixed(4)}, ${result.geo.longitude?.toFixed(4)}`} />
                      </div>
                    </div>
                  )}

                  {/* No data fallback */}
                  {!result.otx && !result.geo && (
                    <div className="py-6 text-center">
                      <p className="text-slate-500 font-mono text-sm">Could not fetch intel for this IP.</p>
                      <p className="text-slate-600 font-mono text-xs mt-1">Use the external links above.</p>
                    </div>
                  )}

                  {/* OSINT links */}
                  <div className="border-t border-cyber-border pt-3 mt-2">
                    <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">OPEN OSINT</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Shodan', url: `https://www.shodan.io/host/${ip}` },
                        { label: 'OTX', url: `https://otx.alienvault.com/indicator/ip/${ip}` },
                        { label: 'Censys', url: `https://search.censys.io/hosts/${ip}` },
                        { label: 'Greynoise', url: `https://www.greynoise.io/viz/ip/${ip}` },
                      ].map(({ label, url }) => (
                        <a
                          key={label}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-slate-400 hover:text-cyber-cyan border border-slate-700 hover:border-cyber-cyan/40 rounded px-2 py-1.5 text-center transition-colors"
                        >
                          {label} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
