import { useCallback, useEffect, useState } from 'react';
import { getSavedItems, isSavedItem, removeSavedItem, toggleSavedItem, type SavedItem } from '../utils/savedItems';

export function useSavedItems() {
  const [items, setItems] = useState<SavedItem[]>(() => getSavedItems());

  const refresh = useCallback(() => {
    setItems(getSavedItems());
  }, []);

  useEffect(() => {
    window.addEventListener('saved-items-change', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('saved-items-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const toggle = useCallback((item: SavedItem) => {
    const saved = toggleSavedItem(item);
    refresh();
    return saved;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    removeSavedItem(id);
    refresh();
  }, [refresh]);

  const has = useCallback((id: string) => isSavedItem(id), []);

  return { items, toggle, remove, has, refresh };
}
