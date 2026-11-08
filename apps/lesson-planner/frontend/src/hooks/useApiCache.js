/**
 * useApiCache — drop-in data fetching hook with skeleton support
 *
 * Features:
 *  - Shows cached data IMMEDIATELY (zero loading flash if cached)
 *  - Stale-while-revalidate via api service
 *  - Listens for background revalidation events to update UI
 *  - Provides `loading` (true only if NO cached data exists yet)
 *  - Provides `refreshing` (silent background refresh is in progress)
 *  - Auto-refetch on window focus (like SWR)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export function useApiCache(url, { transform = null, deps = [], enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);   // true only on first empty load
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async (silent = false) => {
    if (!url || !enabled) return;
    if (!silent) setLoading(prev => prev); // keep loading until data arrives
    else setRefreshing(true);

    try {
      const res = await api.get(url);
      const raw = res.data?.data ?? res.data;
      const result = transform ? transform(raw) : raw;
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [url, enabled, ...deps]); // eslint-disable-line

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    setLoading(data === null); // if we already have data from cache, don't flash skeleton
    fetch(false);
    return () => { mountedRef.current = false; };
  }, [fetch]); // eslint-disable-line

  // Listen for background revalidation
  useEffect(() => {
    const handler = (e) => {
      if (e.detail.url === url && mountedRef.current) {
        const raw = e.detail.data?.data ?? e.detail.data;
        const result = transform ? transform(raw) : raw;
        setData(result);
        setRefreshing(false);
      }
    };
    window.addEventListener('api:revalidate', handler);
    return () => window.removeEventListener('api:revalidate', handler);
  }, [url, transform]);

  // Refetch on window focus (like SWR) — silently
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') fetch(true); };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [fetch]);

  const refetch = useCallback(() => fetch(false), [fetch]);

  return { data, loading, refreshing, error, refetch };
}

export default useApiCache;
