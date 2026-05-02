import { useState, useCallback, useEffect, useRef } from 'react';
import { useAsync } from './useAsync';

type PaginatedFetcher<T> = (skip: number, limit: number, signal?: AbortSignal) => Promise<Record<string, T[] | number>>;

export function usePaginatedList<T>(
  fetcher: PaginatedFetcher<T>,
  itemsKey: string,
  pageSize: number
) {
  const [skip, setSkip] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const initialFetcher = useCallback((signal: AbortSignal) =>
    fetcher(0, pageSize, signal).then((result) => {
      setItems(result[itemsKey] as T[]);
      setTotal(result.total as number);
      setSkip(pageSize);
      return result;
    }),
    [fetcher, pageSize, itemsKey]
  );

  const { loading, error } = useAsync(initialFetcher);

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || items.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await fetcher(skip, pageSize);
      setItems((prev) => [...prev, ...(result[itemsKey] as T[])]);
      setSkip((s) => s + pageSize);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetcher, skip, pageSize, itemsKey, items.length, total]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || error || items.length >= total) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void handleLoadMore();
      }
    }, { rootMargin: '500px 0px' });

    observer.observe(node);
    return () => { observer.disconnect(); };
  }, [loading, error, items.length, total, handleLoadMore]);

  return { items, total, loading, error, loadingMore, handleLoadMore, sentinelRef };
}
