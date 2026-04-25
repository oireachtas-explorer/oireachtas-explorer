import { useState, useCallback, useEffect } from 'react';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { fetchLegislation } from '../api/oireachtas';
import type { Bill, Chamber } from '../types';
import { formatDateShort, billStatusLabel, billStatusClass } from '../utils/format';

interface BillsListProps {
  memberUri: string;
  chamber: Chamber;
  houseNo: number;
}

const PAGE_SIZE = 20;

// Map raw stage names to short display labels
const STAGE_LABELS: Record<string, string> = {
  'First Stage': '1st',
  'Second Stage': '2nd',
  'Committee Stage': 'Cmte',
  'Report Stage': 'Report',
  'Fifth Stage': '5th',
  'Passed': 'Passed',
  'Signed': 'Signed',
};

function shortStage(name: string): string {
  return STAGE_LABELS[name] ?? name.replace(' Stage', '').replace('Stage', '').trim();
}

interface StageNode {
  name: string;
  done: boolean;
  current: boolean;
}

function buildStages(bill: Bill): StageNode[] {
  const ORDERED = ['First Stage', 'Second Stage', 'Committee Stage', 'Report Stage', 'Fifth Stage', 'Passed', 'Signed'];
  const current = bill.currentStage ?? '';
  const currentIdx = ORDERED.findIndex(s => s === current || current.includes(s.split(' ')[0]));

  if (currentIdx < 0) return [];

  return ORDERED.slice(0, Math.min(currentIdx + 2, ORDERED.length)).map((s, i) => ({
    name: shortStage(s),
    done: i < currentIdx || bill.status.toLowerCase() === 'enacted',
    current: i === currentIdx && bill.status.toLowerCase() !== 'enacted',
  }));
}

function BillStagebar({ stages }: { stages: StageNode[] }) {
  if (!stages.length) return null;
  const doneCount = stages.filter(s => s.done).length;
  const currentIdx = stages.findIndex(s => s.current);
  const fillPos = currentIdx >= 0 ? currentIdx : doneCount - 1;
  const allDone = stages.every(s => s.done);
  const fillPct = allDone ? 100 : stages.length <= 1 ? 0 : Math.max(0, (fillPos / (stages.length - 1)) * 100);

  return (
    <div className="stage-bar-wrap">
      <div className="stage-track">
        <div className={`stage-track-fill${allDone ? ' stage-track-fill--complete' : ''}`} style={{ width: `${fillPct}%` }} />
        <div className="stage-nodes">
          {stages.map((s, i) => (
            <div key={i}
              className={`stage-dot-node${s.done ? ' stage-dot-node--done' : ''}${s.current ? ' stage-dot-node--current' : ''}`}
              title={s.name} />
          ))}
        </div>
      </div>
      <div className="stage-labels">
        {stages.map((s, i) => (
          <div key={i} className={`stage-lbl${s.done ? ' stage-lbl--done' : ''}${s.current ? ' stage-lbl--current' : ''}`}>
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function PdfModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const [failed, setFailed] = useState(false);
  const pdfUrl = `https://data.oireachtas.ie/akn/ie/act/${bill.billYear}/${bill.billNo}/eng/enacted/main.pdf`;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => { window.removeEventListener('keydown', h); };
  }, [onClose]);

  return (
    <div className="pdf-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pdf-modal">
        <div className="pdf-modal-hdr">
          <button className="pdf-modal-close" onClick={onClose} aria-label="Close PDF viewer">×</button>
          <div className="pdf-modal-name">{bill.title}</div>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="pdf-open-ext">
            Open in new tab
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
        <div className="pdf-modal-body">
          {!failed ? (
            <iframe src={pdfUrl} title={bill.title} onError={() => { setFailed(true); }} />
          ) : (
            <div className="pdf-fallback">
              <div className="pdf-fallback-icon">📄</div>
              <div className="pdf-fallback-title">{bill.title}</div>
              <div className="pdf-fallback-sub">
                The PDF cannot be embedded directly. Click below to open it in a new tab.
              </div>
              <div className="pdf-meta-grid">
                <div className="pdf-meta-item">
                  <span className="pdf-meta-lbl">Status</span>
                  <span className="pdf-meta-val">{billStatusLabel(bill.status)}</span>
                </div>
                <div className="pdf-meta-item">
                  <span className="pdf-meta-lbl">Year</span>
                  <span className="pdf-meta-val">{bill.billYear}</span>
                </div>
                <div className="pdf-meta-item">
                  <span className="pdf-meta-lbl">Last Updated</span>
                  <span className="pdf-meta-val">{formatDateShort(bill.lastUpdated)}</span>
                </div>
                <div className="pdf-meta-item">
                  <span className="pdf-meta-lbl">Stage</span>
                  <span className="pdf-meta-val">{bill.currentStage}</span>
                </div>
              </div>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="pdf-fallback-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Open Full Bill PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BillsList({ memberUri, chamber, houseNo }: BillsListProps) {
  const [pdfBill, setPdfBill] = useState<Bill | null>(null);

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
      {pdfBill && <PdfModal bill={pdfBill} onClose={() => { setPdfBill(null); }} />}

      <div className="bill-list">
        {allBills.map((b, i) => {
          const stages = buildStages(b);
          const isPrimary = b.sponsors.length > 0 && b.sponsors[0].toLowerCase().includes('primary');
          return (
            <div key={b.uri} className="bill-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="bill-card-badges">
                <span className={`bill-status-badge ${billStatusClass(b.status)}`}>
                  {billStatusLabel(b.status)}
                </span>
                {isPrimary && <span className="bill-sponsor-badge">Primary Sponsor</span>}
                <span className="li-date" style={{ marginLeft: 'auto' }}>{formatDateShort(b.lastUpdated)}</span>
              </div>
              <div className="bill-card-title">{b.title}</div>
              {b.currentStage && (
                <div className="bill-card-longtitle">
                  {b.currentStage}{b.source ? ` · ${b.source}` : ''}
                </div>
              )}
              {stages.length > 0 && <BillStagebar stages={stages} />}
              <div className="bill-card-actions">
                <button className="bill-pdf-btn" onClick={() => { setPdfBill(b); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  View Bill PDF
                </button>
                {b.sponsors.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text4)' }}>
                    Sponsors: {b.sponsors.join(', ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {allBills.length < total && (
        <button className="load-more-btn" onClick={() => { void handleLoadMore(); }} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Load more (${total - allBills.length} remaining)`}
        </button>
      )}
    </>
  );
}
