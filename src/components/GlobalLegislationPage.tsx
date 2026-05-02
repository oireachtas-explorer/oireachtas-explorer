import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Bill, Chamber, Member } from '../types';
import { fetchGlobalLegislation } from '../api/oireachtas';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { getHouseDateRange, getHousePresetYearRange, houseLabel } from '../utils/dail';
import { formatDateShort } from '../utils/format';
import { BillCard } from './BillCard';

type LegislationTab = 'Government' | 'Private Member' | 'Passed';

const PAGE_SIZE = 5000;

function clampDate(value: string, min: string, max: string): string {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function daysBefore(dateIso: string, days: number, min: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  const next = date.toISOString().split('T')[0];
  return next < min ? min : next;
}

function isPassedBill(bill: Bill): boolean {
  const status = bill.status.toLowerCase();
  const stage = bill.currentStage.toLowerCase();
  return bill.hasAct
    || status === 'enacted'
    || (bill.currentStageCompleted === true && (stage === 'passed' || stage === 'signed'));
}

function tabLabel(tab: LegislationTab): string {
  if (tab === 'Private Member') return 'Private Members';
  if (tab === 'Passed') return 'Passed Legislation';
  return tab;
}

function billMatchesTab(bill: Bill, tab: LegislationTab): boolean {
  if (tab === 'Passed') return isPassedBill(bill);
  return bill.source === tab;
}

function byLatestDateDesc(a: Bill, b: Bill): number {
  return b.lastUpdated.localeCompare(a.lastUpdated)
    || b.billYear.localeCompare(a.billYear)
    || Number(b.billNo) - Number(a.billNo);
}

interface GlobalLegislationPageProps {
  chamber: Chamber;
  houseNo: number;
  onBack: () => void;
  allMembers: Member[];
}

export function GlobalLegislationPage({ chamber, houseNo, onBack, allMembers }: GlobalLegislationPageProps) {
  const houseRange = useMemo(() => getHouseDateRange(chamber, houseNo), [chamber, houseNo]);
  const presetYear = useMemo(() => getHousePresetYearRange(chamber, houseNo), [chamber, houseNo]);
  const [activeTab, setActiveTab] = useState<LegislationTab>('Government');
  const [dateStart, setDateStart] = useState(presetYear.start);
  const [dateEnd, setDateEnd] = useState(presetYear.end);

  useEffect(() => {
    setDateStart(presetYear.start);
    setDateEnd(presetYear.end);
    setActiveTab('Government');
  }, [presetYear.start, presetYear.end]);

  const effectiveStart = clampDate(dateStart || houseRange.start, houseRange.start, houseRange.end);
  const effectiveEnd = clampDate(dateEnd || houseRange.end, houseRange.start, houseRange.end);
  const orderedStart = effectiveStart <= effectiveEnd ? effectiveStart : effectiveEnd;
  const orderedEnd = effectiveEnd >= effectiveStart ? effectiveEnd : effectiveStart;

  const fetcher = useCallback((skip: number, limit: number, signal?: AbortSignal) =>
    fetchGlobalLegislation(limit, skip, chamber, houseNo, signal, orderedStart, orderedEnd),
  [chamber, houseNo, orderedStart, orderedEnd]);

  const passedFetcher = useCallback((skip: number, limit: number, signal?: AbortSignal) =>
    fetchGlobalLegislation(limit, skip, chamber, houseNo, signal, orderedStart, orderedEnd, false),
  [chamber, houseNo, orderedStart, orderedEnd]);

  const { items: bills, total, loading, error, loadingMore, sentinelRef } = usePaginatedList<Bill>(fetcher, 'bills', PAGE_SIZE);
  const {
    items: passedSourceBills,
    total: passedTotal,
    loading: loadingPassed,
    error: passedError,
    loadingMore: loadingMorePassed,
    sentinelRef: passedSentinelRef
  } = usePaginatedList<Bill>(passedFetcher, 'bills', PAGE_SIZE);

  const tabCounts = useMemo(() => {
    const counts: Record<LegislationTab, number> = {
      Government: 0,
      'Private Member': 0,
      Passed: passedSourceBills.filter(isPassedBill).length
    };
    for (const bill of bills) {
      if (bill.source === 'Government') counts.Government += 1;
      if (bill.source === 'Private Member') counts['Private Member'] += 1;
    }
    return counts;
  }, [bills, passedSourceBills]);

  const filteredBills = useMemo(
    () => {
      const sourceBills = activeTab === 'Passed' ? passedSourceBills : bills;
      return sourceBills
        .filter((bill) => billMatchesTab(bill, activeTab))
        .toSorted(byLatestDateDesc);
    },
    [bills, passedSourceBills, activeTab]
  );

  const presets = useMemo(() => [
    { label: 'Full term', start: houseRange.start, end: houseRange.end },
    { label: 'Latest year', start: presetYear.start, end: presetYear.end },
    { label: 'Last 90 days', start: daysBefore(houseRange.end, 90, houseRange.start), end: houseRange.end },
    { label: 'Last 30 days', start: daysBefore(houseRange.end, 30, houseRange.start), end: houseRange.end },
  ], [houseRange.start, houseRange.end, presetYear.start, presetYear.end]);

  return (
    <div className="container legislation-page">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="legislation-page__header">
        <div>
          <h1 className="section-heading section-heading--tight">{houseLabel(chamber, houseNo)} Legislation</h1>
          <p className="section-subheading section-subheading--spaced">
            Bills introduced and progressed between {formatDateShort(houseRange.start)} and {formatDateShort(houseRange.end)}.
          </p>
        </div>
      </div>

      <div className="filter-bar legislation-filter-bar">
        <div className="filter-group">
          <label className="filter-label">From</label>
          <input
            className="filter-input"
            type="date"
            value={dateStart}
            min={houseRange.start}
            max={houseRange.end}
            onChange={(event) => { setDateStart(event.target.value); }}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">To</label>
          <input
            className="filter-input"
            type="date"
            value={dateEnd}
            min={houseRange.start}
            max={houseRange.end}
            onChange={(event) => { setDateEnd(event.target.value); }}
          />
        </div>
        <div className="legislation-presets" role="group" aria-label="Legislation period presets">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setDateStart(preset.start);
                setDateEnd(preset.end);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="type-filters" role="tablist" aria-label="Filter legislation by source">
        {(['Government', 'Private Member', 'Passed'] as LegislationTab[]).map((nextTab) => (
          <button
            key={nextTab}
            type="button"
            role="tab"
            aria-selected={activeTab === nextTab}
            className={`type-filter-btn${activeTab === nextTab ? ' type-filter-btn--active' : ''}`}
            onClick={() => { setActiveTab(nextTab); }}
          >
            {tabLabel(nextTab)}
            {tabCounts[nextTab] > 0 ? ` (${tabCounts[nextTab]})` : ''}
          </button>
        ))}
      </div>

      {(activeTab === 'Passed' ? loadingPassed : loading) ? (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <span>Loading legislation…</span>
        </div>
      ) : (activeTab === 'Passed' ? passedError : error) ? (
        <div className="error-banner" role="alert">Failed to load legislation: {activeTab === 'Passed' ? passedError : error}</div>
      ) : filteredBills.length > 0 ? (
        <div className="bill-list">
          {filteredBills.map((bill, index) => (
            <BillCard
              key={bill.uri}
              bill={bill}
              chamber={chamber}
              houseNo={houseNo}
              animationIndex={index}
              showDetailsLink
              allMembers={allMembers}
              collapsibleSummary
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No {tabLabel(activeTab).toLowerCase()} found for the current filters.</p>
        </div>
      )}

      {(activeTab === 'Passed' ? passedSourceBills.length < passedTotal : bills.length < total) && (
        <div
          ref={activeTab === 'Passed' ? passedSentinelRef : sentinelRef}
          className="legislation-auto-load"
          role="status"
          aria-live="polite"
        >
          {(activeTab === 'Passed' ? loadingMorePassed : loadingMore)
            ? 'Loading more legislation…'
            : 'Scroll for more legislation'}
        </div>
      )}
    </div>
  );
}
