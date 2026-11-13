// Cache local (localStorage) avec durée de vie, et repli sur données
// périmées en cas d'erreur réseau.

interface Entry<T> {
  ts: number;
  data: T;
}

const PREFIX = 'mwc-cache:';

export function readCache<T>(key: string): Entry<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Entry<T>) : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // quota dépassé ou stockage bloqué : on purge nos entrées puis on abandonne.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }
}

const inflight = new Map<string, Promise<unknown>>();

/**
 * Renvoie la donnée en cache si elle a moins de `ttl` ms, sinon appelle `loader`.
 * En cas d'échec, renvoie la dernière donnée connue avec `stale: true`.
 */
export async function cached<T>(
  key: string,
  ttl: number,
  loader: () => Promise<T>,
  force = false,
): Promise<{ data: T; fetchedAt: number; stale: boolean }> {
  const hit = readCache<T>(key);
  if (!force && hit && Date.now() - hit.ts < ttl) return { data: hit.data, fetchedAt: hit.ts, stale: false };

  try {
    let p = inflight.get(key) as Promise<T> | undefined;
    if (!p) {
      p = loader();
      inflight.set(key, p);
    }
    const data = await p;
    writeCache(key, data);
    return { data, fetchedAt: Date.now(), stale: false };
  } catch (err) {
    if (hit) return { data: hit.data, fetchedAt: hit.ts, stale: true };
    throw err;
  } finally {
    inflight.delete(key);
  }
}
