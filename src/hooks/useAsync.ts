import { useState, useEffect } from 'react';

export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: { enabled?: boolean } = {}
): { data: T | null; loading: boolean; error: string | null } {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fn(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [fn, enabled]);

  return { data, loading, error };
}
