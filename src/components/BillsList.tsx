import { useCallback } from 'react';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { fetchLegislation } from '../api/oireachtas';
import type { Bill, Chamber } from '../types';
import { BillCard } from './BillCard';

interface BillsListProps {
  memberUri: string;
  chamber: Chamber;
  houseNo: number;
}

const PAGE_SIZE = 20;

export function BillsList({ memberUri, chamber, houseNo }: BillsListProps) {
  const fetcher = useCallback((skip: number, limit: number, signal?: AbortSignal) =>
    fetchLegislation(memberUri, limit, skip, chamber, houseNo, signal), [memberUri, chamber, houseNo]);

  const { items: allBills, total, loading, error, loadingMore, handleLoadMore } = usePaginatedList<Bill>(fetcher, 'bills', PAGE_SIZE);

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <span>Loading legislation…</span>
      </div>
    );
  }

  if (error) return <div className="error-banner" role="alert">Failed to load legislation: {error}</div>;

  if (allBills.length === 0) {
    return <div className="empty-state"><p>No legislation records found for this member.</p></div>;
  }

  return (
    <>
      <div className="bill-list">
        {allBills.map((bill, index) => (
          <BillCard key={bill.uri} bill={bill} chamber={chamber} houseNo={houseNo} animationIndex={index} />
        ))}
      </div>

      {allBills.length < total && (
        <button className="load-more-btn" onClick={() => { void handleLoadMore(); }} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Load more (${total - allBills.length} remaining)`}
        </button>
      )}
    </>
  );
}
