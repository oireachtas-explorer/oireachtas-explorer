import type { Chamber } from '../types';

export type SavedItemType = 'member' | 'bill' | 'debate' | 'speech' | 'question';

export interface SavedItem {
  id: string;
  type: SavedItemType;
  title: string;
  subtitle?: string;
  citation?: string;
  quote?: string;
  sourceDate?: string;
  urlHash: string;
  chamber: Chamber;
  houseNo: number;
  savedAt: string;
}

const STORAGE_KEY = 'oireachtas-explorer:saved-items';

function readRaw(): SavedItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) as SavedItem[] : [];
  } catch {
    return [];
  }
}

function writeRaw(items: SavedItem[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('saved-items-change'));
}

export function getSavedItems(): SavedItem[] {
  return readRaw().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function isSavedItem(id: string): boolean {
  return readRaw().some((item) => item.id === id);
}

export function toggleSavedItem(item: SavedItem): boolean {
  const existing = readRaw();
  if (existing.some((saved) => saved.id === item.id)) {
    writeRaw(existing.filter((saved) => saved.id !== item.id));
    return false;
  }
  writeRaw([{ ...item, savedAt: new Date().toISOString() }, ...existing]);
  return true;
}

export function removeSavedItem(id: string): void {
  writeRaw(readRaw().filter((saved) => saved.id !== id));
}
