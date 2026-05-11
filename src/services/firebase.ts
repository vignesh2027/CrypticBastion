import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, query, limitToLast, set, Database } from 'firebase/database';
import type { ThreatEvent, ProtocolMetric, InfraNode } from '../types';

let db: Database | null = null;

try {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
} catch {
  // Firebase unavailable — app runs on mock telemetry only
}

export { db };

export async function pushThreatEvent(event: ThreatEvent) {
  if (!db) return;
  try { await push(ref(db, 'threatEvents'), event); } catch {}
}

export async function pushProtocolSnapshot(metrics: ProtocolMetric[]) {
  if (!db) return;
  try { await set(ref(db, `protocol/${Date.now()}`), metrics); } catch {}
}

export async function pushInfraSnapshot(nodes: InfraNode[]) {
  if (!db) return;
  try { await set(ref(db, `infra/${Date.now()}`), nodes); } catch {}
}

export function subscribeToThreatHistory(
  limit: number,
  cb: (events: ThreatEvent[]) => void
): () => void {
  if (!db) { cb([]); return () => {}; }
  try {
    const q = query(ref(db, 'threatEvents'), limitToLast(limit));
    const unsub = onValue(q, (snap) => {
      const val = snap.val();
      if (!val) return cb([]);
      const events = Object.values(val) as ThreatEvent[];
      cb(events.sort((a, b) => b.timestamp - a.timestamp));
    });
    return unsub;
  } catch { return () => {}; }
}
