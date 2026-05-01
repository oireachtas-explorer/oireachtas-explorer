import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useSavedItems } from '../hooks/useSavedItems';
import type { SavedItem } from '../utils/savedItems';

interface SaveButtonProps {
  item: SavedItem;
  className?: string;
}

export function SaveButton({ item, className = '' }: SaveButtonProps) {
  const { toggle, has } = useSavedItems();
  const saved = has(item.id);
  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      className={`save-btn ${saved ? 'save-btn--saved' : ''} ${className}`.trim()}
      onClick={() => { toggle(item); }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${item.title} from saved items` : `Save ${item.title}`}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  );
}
