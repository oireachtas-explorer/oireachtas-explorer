import { useCallback, useState, useEffect, useMemo } from 'react';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { fetchGlobalDebates, type ChamberType } from '../api/oireachtas';
import type { Chamber, Debate, View } from '../types';
import { formatDateShort } from '../utils/format';
import { getHouseDateRange, chamberName } from '../utils/dail';
import { DEFAULT_PAGE_SIZE } from '../constants';

interface GlobalDebatesListProps {
  chamber: Chamber;
  houseNo: number;
  onNavigateToDebate: (view: View) => void;
}

// Extract a committee code from an Oireachtas debate URI.
// Shape: https://data.oireachtas.ie/akn/ie/debateRecord/{chamber_or_committee}/{date}/...
// Chamber segments are 'dail' or 'seanad'; anything else is a committee slug.
function committeeCodeFromUri(uri: string): string | null {
  const match = /\/debateRecord\/([a-z][a-z0-9_]+)\//i.exec(uri);
  if (!match) return null;
  const seg = match[1].toLowerCase();
  if (seg === 'dail' || seg === 'seanad') return null;
  return seg;
}

function humanizeCommittee(code: string): string {
  return code
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function committeeCodeForDebate(d: Debate): string | null {
  const fromUri = committeeCodeFromUri(d.uri);
  if (fromUri) return fromUri;
  for (const s of d.sections) {
    const code = committeeCodeFromUri(s.uri);
    if (code) return code;
  }
  return null;
}

interface DebateRow {
  key: string;
  debate: Debate;
  sectionUri: string;
  title: string;
  committeeCode: string | null;
}

function flattenDebates(debates: Debate[]): DebateRow[] {
  const rows: DebateRow[] = [];
  for (const d of debates) {
    const fallbackCode = committeeCodeForDebate(d);
    if (d.sections.length > 0) {
      for (const s of d.sections) {
        rows.push({
          key: `${d.uri}::${s.uri}`,
          debate: d,
          sectionUri: s.uri,
          title: s.title,
          committeeCode: committeeCodeFromUri(s.uri) ?? fallbackCode,
        });
      }
    } else if (d.debateSectionUri) {
      rows.push({
        key: d.uri,
        debate: d,
        sectionUri: d.debateSectionUri,
        title: d.title,
        committeeCode: fallbackCode,
      });
    }
  }
  return rows;
}

export function GlobalDebatesList({ chamber, houseNo, onNavigateToDebate }: GlobalDebatesListProps) {
  const [chamberType, setChamberType] = useState<ChamberType>('house');
  const [committeeCode, setCommitteeCode] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const range = getHouseDateRange(chamber, houseNo);
    setDateStart(range.start);
    const today = new Date().toISOString().split('T')[0];
    setDateEnd(range.end > today ? today : range.end);
  }, [chamber, houseNo]);

  useEffect(() => {
    const t = setTimeout(() => { setSearchTerm(searchInput.trim()); }, 200);
    return () => { clearTimeout(t); };
  }, [searchInput]);

  // Reset committee filter when chamber changes
  useEffect(() => {
    setCommitteeCode('');
  }, [chamberType]);

  const fetcher = useCallback((skip: number, limit: number, signal?: AbortSignal) =>
    fetchGlobalDebates(limit, skip, chamber, houseNo, chamberType, dateStart || undefined, dateEnd || undefined, signal),
  [chamber, houseNo, chamberType, dateStart, dateEnd]);

  const { items: allDebates, total, loading, error, loadingMore, handleLoadMore } = usePaginatedList<Debate>(fetcher, 'debates', DEFAULT_PAGE_SIZE);

  const allRows = useMemo(() => flattenDebates(allDebates), [allDebates]);

  // Committee dropdown: count per-section rows so the tallies reflect what
  // the user actually sees, not the number of sitting days.
  const availableCommittees = useMemo(() => {
    if (chamberType !== 'committee') return [];
    const counts = new Map<string, number>();
    for (const r of allRows) {
      if (r.committeeCode) counts.set(r.committeeCode, (counts.get(r.committeeCode) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, name: humanizeCommittee(code), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [allRows, chamberType]);

  const term = searchTerm.toLowerCase();

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (chamberType === 'committee' && committeeCode) {
        if (r.committeeCode !== committeeCode) return false;
      }
      if (!term) return true;
      if (r.title.toLowerCase().includes(term)) return true;
      if (r.debate.chamber.toLowerCase().includes(term)) return true;
      if (r.debate.date.includes(term)) return true;
      return false;
    });
  }, [allRows, chamberType, committeeCode, term]);

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <span>Loading all debates…</span>
      </div>
    );
  }

  if (error) {
    return <div className="error-banner" role="alert">Failed to load debates: {error}</div>;
  }

  // Group filtered rows by month
  const monthGroups = useMemo(() => {
    const g: Record<string, typeof filteredRows> = {};
    for (const r of filteredRows) {
      const m = r.debate.date.slice(0, 7);
      if (!g[m]) g[m] = [];
      g[m].push(r);
    }
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredRows]);

  function groupLabel(ym: string) {
    const [y, m] = ym.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[+m - 1]} ${y}`;
  }

  return (
    <>
      {/* Type filter pills */}
      <div className="type-filters">
        {(['house', 'committee', ''] as ChamberType[]).map((t) => {
          const label = t === 'house' ? `${chamberName(chamber)} Plenary` : t === 'committee' ? 'Committees' : 'All';
          return (
            <button key={t ?? 'all'}
              className={`type-filter-btn${chamberType === t ? ' type-filter-btn--active' : ''}`}
              onClick={() => { setChamberType(t); }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-group filter-search">
          <label className="filter-label">
            Search{term && ` — ${filteredRows.length} of ${allRows.length} match`}
          </label>
          <input className="filter-input" type="text"
            placeholder="Search debates by title, chamber or date…"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); }} />
        </div>

        {chamberType === 'committee' && (
          <div className="filter-group" style={{ flex: '1 1 200px' }}>
            <label className="filter-label">
              Committee{availableCommittees.length > 0 ? ` (${availableCommittees.length})` : ''}
            </label>
            <select className="filter-select" value={committeeCode}
              onChange={e => { setCommitteeCode(e.target.value); }}
              disabled={availableCommittees.length === 0}>
              <option value="">All committees</option>
              {availableCommittees.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.count})</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label">From</label>
          <input className="filter-input" type="date" value={dateStart}
            onChange={e => { setDateStart(e.target.value); }} />
        </div>
        <div className="filter-group">
          <label className="filter-label">To</label>
          <input className="filter-input" type="date" value={dateEnd}
            onChange={e => { setDateEnd(e.target.value); }} />
        </div>
        <div style={{ alignSelf: 'flex-end', fontSize: 13, color: 'var(--text3)', whiteSpace: 'nowrap', paddingBottom: 9 }}>
          {filteredRows.length} result{filteredRows.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Results grouped by month */}
      {monthGroups.length === 0 ? (
        <div className="empty-state">No debates match your filters. Try clearing the search or loading more.</div>
      ) : monthGroups.map(([ym, rows]) => (
        <div key={ym} className="date-group">
          <div className="date-group-label">{groupLabel(ym)}</div>
          <div className="debate-list">
            {rows.map((r) => {
              const canRead = !!r.debate.xmlUri;
              return (
                <div key={r.key} className="debate-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="debate-item__title">{r.title}</div>
                    <div className="debate-item__meta">
                      <span className="debate-item__date">{formatDateShort(r.debate.date)}</span>
                      <span style={{ fontSize: 12, color: 'var(--text4)' }}>{r.debate.chamber}</span>
                    </div>
                  </div>
                  {canRead && (
                    <button className="transcript-btn"
                      onClick={() => { onNavigateToDebate({
                        kind: 'debate-viewer',
                        xmlUri: r.debate.xmlUri ?? '',
                        debateSectionUri: r.sectionUri,
                        title: r.title,
                      }); }}>
                      Transcript
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {allDebates.length < total && (
        <button className="load-more-btn" onClick={() => { void handleLoadMore(); }} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Load more (${total - allDebates.length} days remaining)`}
        </button>
      )}
    </>
  );
}
