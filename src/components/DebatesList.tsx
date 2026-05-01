import { useCallback, useState } from 'react';
import { Link } from 'lucide-react';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { fetchDebates } from '../api/oireachtas';
import type { Chamber, Debate } from '../types';
import { formatDateShort } from '../utils/format';
import { viewToHash } from '../utils/routing';
import { ShareModal } from './ShareModal';

interface DebatesListProps {
  memberUri: string;
  chamber: Chamber;
  houseNo: number;
}

const PAGE_SIZE = 20;

export function DebatesList({ memberUri, chamber, houseNo }: DebatesListProps) {
  const [shareDebate, setShareDebate] = useState<Debate | null>(null);

  const fetcher = useCallback((skip: number, limit: number, signal?: AbortSignal) =>
    fetchDebates(memberUri, limit, skip, chamber, houseNo, signal), [memberUri, chamber, houseNo]);

  const { items: allDebates, total, loading, error, loadingMore, handleLoadMore } = usePaginatedList<Debate>(fetcher, 'debates', PAGE_SIZE);

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <span>Loading debates…</span>
      </div>
    );
  }

  if (error) {
    return <div className="error-banner" role="alert">Failed to load debates: {error}</div>;
  }

  if (allDebates.length === 0) {
    return <div className="empty-state">No debate records found.</div>;
  }

  const debateShareUrl = shareDebate?.xmlUri && shareDebate.debateSectionUri
    ? window.location.origin + window.location.pathname + viewToHash({ kind: 'debate-viewer', xmlUri: shareDebate.xmlUri, debateSectionUri: shareDebate.debateSectionUri, title: shareDebate.title, focusMemberUri: memberUri }, chamber, houseNo)
    : '';

  return (
    <>
      {shareDebate && debateShareUrl && <ShareModal url={debateShareUrl} onClose={() => { setShareDebate(null); }} />}
      <div className="debate-list">
        {allDebates.map((d) => {
          const canRead = !!(d.xmlUri && d.debateSectionUri);
          return (
            <div key={d.uri} className="debate-item" style={{ position: 'relative' }}>
              {canRead && (
                <button className="card-link-btn" onClick={() => { setShareDebate(d); }} aria-label={`Copy link to ${d.title}`}>
                  <Link size={14} />
                </button>
              )}
              <div className="debate-item__meta">
                <span className="debate-item__date">{formatDateShort(d.date)}</span>
                <span className="chamber-badge">{d.chamber}</span>
              </div>
              <div className="debate-item__title">{d.title}</div>
              {canRead && (
                <div className="debate-item__actions" style={{ marginTop: '0.5rem' }}>
                  <a 
                    className="read-transcript-btn" 
                    href={viewToHash({ kind: 'debate-viewer', xmlUri: d.xmlUri ?? '', debateSectionUri: d.debateSectionUri ?? '', title: d.title, focusMemberUri: memberUri }, chamber, houseNo)}
                    style={{ display: 'inline-block', fontSize: '0.85rem', padding: '6px 12px', borderRadius: '4px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', textDecoration: 'none', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  >
                    View Full Debate
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allDebates.length < total && (
        <button className="load-more-btn" onClick={() => { void handleLoadMore(); }} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Load more (${total - allDebates.length} remaining)`}
        </button>
      )}
    </>
  );
}
