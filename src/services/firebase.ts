import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, query, limitToLast, set } from 'firebase/database';
import type { ThreatEvent, ProtocolMetric, InfraNode } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export async function pushThreatEvent(event: ThreatEvent) {
  try {
    await push(ref(db, 'threatEvents'), event);
  } catch {}
}

export async function pushProtocolSnapshot(metrics: ProtocolMetric[]) {
  try {
    await set(ref(db, `protocol/${Date.now()}`), metrics);
  } catch {}
}

export async function pushInfraSnapshot(nodes: InfraNode[]) {
  try {
    await set(ref(db, `infra/${Date.now()}`), nodes);
  } catch {}
}

export function subscribeToThreatHistory(
  limit: number,
  cb: (events: ThreatEvent[]) => void
): () => void {
  const q = query(ref(db, 'threatEvents'), limitToLast(limit));
  const unsub = onValue(q, (snap) => {
    const val = snap.val();
    if (!val) return cb([]);
    const events = Object.values(val) as ThreatEvent[];
    cb(events.sort((a, b) => b.timestamp - a.timestamp));
  });
  return unsub;
}
