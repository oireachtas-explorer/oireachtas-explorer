import { useCallback, useState, useEffect, useMemo } from 'react';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useAsync } from '../hooks/useAsync';
import { fetchCommitteeDebateIndex, fetchCommitteeDebateSearch, fetchGlobalDebates, type ChamberType, type CommitteeDebateIndexItem } from '../api/oireachtas';
import type { Chamber, Debate, View } from '../types';
import { formatDateShort } from '../utils/format';
import { getHouseDateRange, chamberName } from '../utils/dail';
import { DEFAULT_PAGE_SIZE } from '../constants';

interface GlobalDebatesListProps {
  chamber: Chamber;
  houseNo: number;
  onNavigateToDebate: (view: View) => void;
}

const EMPTY_COMMITTEE_INDEX: CommitteeDebateIndexItem[] = [];

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

function committeeCodeForDebate(d: Debate): string | null {
  const fromUri = committeeCodeFromUri(d.uri);
  if (fromUri) return fromUri;
  for (const s of d.sections) {
    const code = committeeCodeFromUri(s.uri);
    if (code) return code;
  }
  return null;
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
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
  const [committeeQuery, setCommitteeQuery] = useState('');

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
    setCommitteeQuery('');
  }, [chamberType]);

  const fetcher = useCallback((skip: number, limit: number, signal?: AbortSignal) =>
    fetchGlobalDebates(limit, skip, chamber, houseNo, chamberType, dateStart || undefined, dateEnd || undefined, signal),
  [chamber, houseNo, chamberType, dateStart, dateEnd]);

  const { items: allDebates, total, loading, error, loadingMore, handleLoadMore } = usePaginatedList<Debate>(fetcher, 'debates', DEFAULT_PAGE_SIZE);

  const committeeFetcher = useCallback((signal: AbortSignal) =>
    fetchCommitteeDebateIndex(chamber, houseNo, signal),
  [chamber, houseNo]);
  const {
    data: committeeIndex,
    loading: loadingCommittees,
    error: committeeIndexError,
  } = useAsync(committeeFetcher, { enabled: chamberType === 'committee' });
  const availableCommittees = committeeIndex ?? EMPTY_COMMITTEE_INDEX;

  const selectedCommittee = useMemo(
    () => availableCommittees.find((c) => c.code === committeeCode) ?? null,
    [availableCommittees, committeeCode]
  );

  const committeeSearchFetcher = useCallback((signal: AbortSignal) =>
    fetchCommitteeDebateSearch(chamber, houseNo, committeeCode, dateStart || undefined, dateEnd || undefined, signal),
  [chamber, houseNo, committeeCode, dateStart, dateEnd]);
  const {
    data: committeeSearch,
    loading: loadingCommitteeSearch,
    error: committeeSearchError,
  } = useAsync(committeeSearchFetcher, { enabled: chamberType === 'committee' && committeeCode !== '' });

  const committeeMatches = useMemo(() => {
    const query = normalizeSearch(committeeQuery);
    if (!query) return [];
    return availableCommittees
      .filter((c) => {
        const name = normalizeSearch(c.name);
        const code = normalizeSearch(c.code);
        return name.includes(query) || code.includes(query);
      })
      .slice(0, 12);
  }, [availableCommittees, committeeQuery]);

  const term = searchTerm.toLowerCase();
  const sourceDebates = committeeCode && committeeSearch ? committeeSearch.debates : allDebates;
  const sourceRows = useMemo(() => flattenDebates(sourceDebates), [sourceDebates]);

  const filteredRows = useMemo(() => {
    return sourceRows.filter((r) => {
      if (!term) return true;
      if (r.title.toLowerCase().includes(term)) return true;
      if (r.debate.chamber.toLowerCase().includes(term)) return true;
      if (r.debate.date.includes(term)) return true;
      return false;
    });
  }, [sourceRows, term]);

  // Group filtered rows by month — must be before any early returns (rules of hooks)
  const monthGroups = useMemo(() => {
    const g: Partial<Record<string, typeof filteredRows>> = {};
    for (const r of filteredRows) {
      const m = r.debate.date.slice(0, 7);
      g[m] ??= [];
      g[m].push(r);
    }
    return Object.entries(g)
      .map(([month, rows]) => [month, rows ?? []] as const)
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredRows]);

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
            <button key={t || 'all'}
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
            Search{term && ` — ${filteredRows.length} of ${sourceRows.length} match`}
          </label>
          <input className="filter-input" type="text"
            placeholder="Search debates by title, chamber or date…"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); }} />
        </div>

        {chamberType === 'committee' && (
          <div className="filter-group" style={{ flex: '1 1 200px' }}>
            <label className="filter-label">
              Committee{loadingCommittees ? ' (loading)' : availableCommittees.length > 0 ? ` (${availableCommittees.length})` : ''}
            </label>
            <div className="committee-picker" role="combobox" aria-expanded={!selectedCommittee && committeeMatches.length > 0} aria-haspopup="listbox" aria-owns="committee-results">
              <div className="committee-picker__input-wrap">
                <input
                  className="filter-input committee-picker__input"
                  type="search"
                  placeholder={loadingCommittees ? 'Loading committees...' : 'Search committees...'}
                  value={committeeQuery}
                  disabled={loadingCommittees || availableCommittees.length === 0}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCommitteeQuery(next);
                    if (committeeCode && normalizeSearch(next) !== normalizeSearch(selectedCommittee?.name ?? '')) {
                      setCommitteeCode('');
                    }
                  }}
                />
                {selectedCommittee && (
                  <button
                    type="button"
                    className="committee-picker__clear"
                    onClick={() => {
                      setCommitteeCode('');
                      setCommitteeQuery('');
                    }}
                    aria-label="Clear committee filter">
                    Clear
                  </button>
                )}
              </div>
              {committeeQuery && !selectedCommittee && (
                <div id="committee-results" className="committee-picker__results" role="listbox" aria-label="Matching committees">
                  {committeeMatches.length > 0 ? committeeMatches.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      className={`committee-picker__option${c.code === committeeCode ? ' committee-picker__option--active' : ''}`}
                      role="option"
                      aria-selected={c.code === committeeCode}
                      onClick={() => {
                        setCommitteeCode(c.code);
                        setCommitteeQuery(c.name);
                      }}>
                      <span>{c.name}</span>
                      <small>{c.count}</small>
                    </button>
                  )) : (
                    <div className="committee-picker__empty">No matching committees</div>
                  )}
                </div>
              )}
            </div>
            {committeeIndexError && (
              <div className="filter-help">Committee list unavailable; loaded debates can still be searched.</div>
            )}
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
      {committeeSearchError ? (
        <div className="error-banner" role="alert">Failed to search committee debates: {committeeSearchError}</div>
      ) : loadingCommitteeSearch ? (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <span>Searching {selectedCommittee?.name ?? 'committee'} debates…</span>
        </div>
      ) : monthGroups.length === 0 ? (
        <div className="empty-state">
          {committeeCode ? 'No debates match your filters. Try clearing the search.' : 'No debates match your filters. Try clearing the search or loading more.'}
        </div>
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

      {!committeeCode && allDebates.length < total && (
        <button className="load-more-btn" onClick={() => { void handleLoadMore(); }} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Load more (${total - allDebates.length} days remaining)`}
        </button>
      )}
    </>
  );
}
