import { useEffect, useState } from 'react';

/**
 * Small in-memory cache for the Resultados reports.
 *
 * Every tab used to refetch on mount, so hopping between tabs (or back to one)
 * always showed a spinner. Results are now kept for a short while per
 * (report, window), and the layout prefetches every tab when the period changes,
 * so switching tabs renders straight from memory.
 */

const TTL_MS = 60_000;

interface Entry<T> {
  at: number;
  promise: Promise<T>;
  value?: T;
}

const cache = new Map<string, Entry<unknown>>();

interface Window { from: Date; to: Date }

const keyOf = (name: string, w: Window) => `${name}|${w.from.toISOString()}|${w.to.toISOString()}`;

function fresh(key: string): Entry<unknown> | undefined {
  const entry = cache.get(key);
  return entry && Date.now() - entry.at < TTL_MS ? entry : undefined;
}

/** Starts (or reuses) the fetch for a report. Failures are not cached. */
export function loadReport<T, W extends Window>(name: string, fetcher: (w: W) => Promise<T>, w: W): Promise<T> {
  const key = keyOf(name, w);
  const hit = fresh(key);
  if (hit) return hit.promise as Promise<T>;

  const entry: Entry<T> = { at: Date.now(), promise: fetcher(w) };
  entry.promise.then(
    (value) => { entry.value = value; },
    () => { if (cache.get(key) === entry) cache.delete(key); },
  );
  cache.set(key, entry as Entry<unknown>);
  return entry.promise;
}

export function useReport<T, W extends Window>(name: string, fetcher: (w: W) => Promise<T>, w: W | null) {
  const cached = w ? (fresh(keyOf(name, w))?.value as T | undefined) : undefined;
  const [data, setData] = useState<T | undefined>(cached);
  const [loading, setLoading] = useState(cached === undefined);
  const [failed, setFailed] = useState(false);
  const from = w?.from.getTime();
  const to = w?.to.getTime();

  useEffect(() => {
    if (!w) return;
    let cancelled = false;
    const hit = fresh(keyOf(name, w))?.value as T | undefined;
    if (hit !== undefined) {
      setData(hit); setLoading(false); setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    loadReport(name, fetcher, w)
      .then((value) => { if (!cancelled) setData(value); })
      .catch((err) => {
        if (cancelled) return;
        console.error(`[results] ${name}:`, err);
        setData(undefined); setFailed(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the window's timestamps
  }, [name, from, to]);

  return { data, loading, failed };
}
