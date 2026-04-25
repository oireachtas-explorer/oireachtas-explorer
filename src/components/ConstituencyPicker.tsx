import { useMemo, useState } from 'react';
import type { Chamber, Constituency, Member } from '../types';

interface ConstituencyPickerProps {
  constituencies: Constituency[];
  allMembers: Member[];
  loading: boolean;
  loadingMembers: boolean;
  chamber: Chamber;
  houseNo: number;
  onSelect: (code: string, name: string) => void;
}

export function ConstituencyPicker({
  constituencies,
  loading,
  chamber,
  onSelect,
}: ConstituencyPickerProps) {
  const groupLabel = chamber === 'seanad' ? 'Panels' : 'Constituencies';
  const groupSingular = chamber === 'seanad' ? 'panel' : 'constituency';
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return constituencies;
    return constituencies.filter((c) => c.name.toLowerCase().includes(q));
  }, [constituencies, query]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = filtered.at(activeIndex);
      if (c) onSelect(c.code, c.name);
    }
  }

  return (
    <div className="constituency-picker-contents">

      {loading ? (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <span>Loading {groupLabel.toLowerCase()}…</span>
        </div>
      ) : (
        <div className="picker__form">
          <label className="picker__label" htmlFor="constituency-search">
            {chamber === 'seanad' ? 'Find a panel' : 'Find your constituency'}
          </label>
          <div className="picker__combobox" role="combobox" aria-expanded="true" aria-haspopup="listbox" aria-owns="constituency-results">
            <input
              id="constituency-search"
              className="picker__input"
              type="text"
              placeholder="Type to search…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              aria-controls="constituency-results"
              aria-activedescendant={filtered[activeIndex] ? `constituency-opt-${filtered[activeIndex].code}` : undefined}
            />
            {filtered.length === 0 ? (
              <div className="picker__results-empty">No {groupSingular} matches "{query}"</div>
            ) : (
              <ul id="constituency-results" className="picker__results" role="listbox">
                {filtered.map((c, i) => (
                  <li key={c.code} role="option" aria-selected={i === activeIndex}>
                    <button
                      type="button"
                      id={`constituency-opt-${c.code}`}
                      className={`picker__result${i === activeIndex ? ' picker__result--active' : ''}`}
                      onMouseEnter={() => { setActiveIndex(i); }}
                      onClick={() => { onSelect(c.code, c.name); }}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
