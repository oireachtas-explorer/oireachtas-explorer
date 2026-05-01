import { useAsync } from '../hooks/useAsync';
import { fetchBill } from '../api/oireachtas';
import { useCallback, useMemo, useState } from 'react';
import { formatDateShort, billStatusLabel, billStatusClass } from '../utils/format';
import { FileText, Download } from 'lucide-react';
import type { Bill, BillDocument, Chamber } from '../types';
import { SaveButton } from './SaveButton';
import { viewToHash } from '../utils/routing';

interface BillViewerPageProps {
  billNo: string;
  billYear: string;
  chamber: Chamber;
  houseNo: number;
  onBack: () => void;
}

export function BillViewerPage({ billNo, billYear, chamber, houseNo, onBack }: BillViewerPageProps) {
  const fetcher = useCallback((signal: AbortSignal) => fetchBill(billNo, billYear, signal), [billNo, billYear]);
  const { data: bill, loading, error } = useAsync(fetcher);
  const [activeDocKey, setActiveDocKey] = useState('');

  if (loading) {
    return (
      <div className="container">
        <button className="back-button" onClick={onBack} style={{ marginBottom: '1.5rem', background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: 0, fontSize: '1rem', fontWeight: 600 }}>
          ← Back
        </button>
        <div className="loading-state" role="status">
          <div className="spinner" aria-hidden="true" />
          <span>Loading legislation record…</span>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="container">
        <button className="back-button" onClick={onBack} style={{ marginBottom: '1.5rem', background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: 0, fontSize: '1rem', fontWeight: 600 }}>
          ← Back
        </button>
        <div className="error-banner">Failed to load bill: {error ?? 'Not found'}</div>
      </div>
    );
  }

  const documents = [
    ...(bill.versions ?? []).map((doc, index) => ({ ...doc, key: `version-${index}`, group: 'Version' })),
    ...(bill.relatedDocs ?? []).map((doc, index) => ({ ...doc, key: `related-${index}`, group: 'Related' })),
  ];
  const activeDoc = documents.find((doc) => doc.key === activeDocKey) ?? documents.find((doc) => doc.pdfUri);
  const activePdfUrl = activeDoc?.pdfUri;

  return (
    <div className="container" style={{ maxWidth: '1200px', animation: 'fadeInUp 0.3s ease' }}>
      <button className="back-button" onClick={onBack} style={{ marginBottom: '1.5rem', background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: 0, fontSize: '1rem', fontWeight: 600 }}>
        ← Back
      </button>

      <div style={{ padding: '2rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', marginBottom: '2rem', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
              <span className={`bill-status-badge ${billStatusClass(bill.status)}`}>
                {billStatusLabel(bill.status)}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                {bill.source} • Bill {bill.billNo} of {bill.billYear}
              </span>
            </div>
            <h1 style={{ fontSize: '2.2rem', color: 'var(--color-text-primary)', marginBottom: '1rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              {bill.title}
            </h1>
          </div>
          <SaveButton
            item={{
              id: `bill:${bill.billYear}:${bill.billNo}`,
              type: 'bill',
              title: bill.title,
              subtitle: `Bill ${bill.billNo} of ${bill.billYear} · ${billStatusLabel(bill.status)}`,
              urlHash: viewToHash({ kind: 'bill-viewer', billNo: bill.billNo, billYear: bill.billYear }, chamber, houseNo),
              chamber,
              houseNo,
              savedAt: '',
            }}
          />
        </div>

        {bill.longTitleEn && (
          <div 
            style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '2rem', padding: '1.5rem', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}
            dangerouslySetInnerHTML={{ __html: bill.longTitleEn }}
          />
        )}

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Sponsors</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {bill.sponsors.map((s, i) => (
                <span key={i} style={{ padding: '6px 14px', background: 'var(--color-green-50)', color: 'var(--color-accent)', borderRadius: 'var(--radius-pill)', fontSize: '0.9rem', fontWeight: 600, border: '1px solid var(--color-green-100)' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Current Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Origin House</span>
                <span style={{ fontWeight: 600 }}>{bill.originHouse}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Current Stage</span>
                <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{bill.currentStage}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Last Updated</span>
                <span style={{ fontWeight: 600 }}>{formatDateShort(bill.lastUpdated)}</span>
              </div>
            </div>
          </div>
        </div>

        <BillTimeline bill={bill} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '2rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '800px', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-secondary)' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
              <FileText size={20} className="color-accent" />
              {activeDoc?.title ?? 'Official Document'}
            </h3>
            {activePdfUrl && (
              <a 
                href={activePdfUrl} 
                target="_blank" 
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}
              >
                <Download size={16} /> Open externally
              </a>
            )}
          </div>
          {activePdfUrl ? (
            <iframe 
              src={activePdfUrl} 
              style={{ width: '100%', height: '100%', border: 'none', background: '#f5f5f5' }}
              title="Bill PDF Viewer"
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
              No PDF document available for this bill.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {documents.length > 0 && (
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Document Viewer</h3>
              <div className="document-picker">
                {documents.map((doc) => (
                  <button
                    key={doc.key}
                    type="button"
                    className={`document-picker__item${activeDoc?.key === doc.key ? ' document-picker__item--active' : ''}`}
                    onClick={() => { setActiveDocKey(doc.key); }}
                    disabled={!doc.pdfUri}
                  >
                    <span>{doc.title}</span>
                    <small>{doc.group} · {formatDateShort(doc.date)}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Versions</h3>
            {bill.versions && bill.versions.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0 }}>
                {bill.versions.map((v, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{v.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{formatDateShort(v.date)}</div>
                    </div>
                    {v.pdfUri && (
                      <a href={v.pdfUri} target="_blank" rel="noreferrer" style={{ padding: '6px 10px', background: 'var(--color-bg-secondary)', borderRadius: '6px', color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                        PDF
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)' }}>No versions found.</div>
            )}
          </div>

          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Related Documents</h3>
            {bill.relatedDocs && bill.relatedDocs.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0 }}>
                {bill.relatedDocs.map((d, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{d.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{formatDateShort(d.date)}</div>
                    </div>
                    {d.pdfUri && (
                      <a href={d.pdfUri} target="_blank" rel="noreferrer" style={{ padding: '6px 10px', background: 'var(--color-bg-secondary)', borderRadius: '6px', color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                        PDF
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)' }}>No related documents.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BillTimeline({ bill }: { bill: Bill }) {
  const events = useMemo(() => {
    const fromStages = (bill.stages ?? [])
      .flatMap((stage) => {
        const event = stage.event;
        if (!event) return [];
        const firstDate = event.dates[0]?.date ?? '';
        return [{
          key: event.uri,
          date: firstDate,
          title: event.showAs,
          meta: `${event.house.showAs}${event.stageOutcome ? ` · ${event.stageOutcome}` : ''}`,
          complete: event.stageCompleted,
        }];
      });

    const fromDocs = [
      ...(bill.versions ?? []).map((doc: BillDocument, index) => ({
        key: `doc-version-${index}`,
        date: doc.date,
        title: doc.title,
        meta: 'Bill version published',
        complete: true,
      })),
      ...(bill.relatedDocs ?? []).map((doc: BillDocument, index) => ({
        key: `doc-related-${index}`,
        date: doc.date,
        title: doc.title,
        meta: 'Related document published',
        complete: true,
      })),
    ];

    return [...fromStages, ...fromDocs]
      .filter((event) => event.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [bill]);

  if (events.length === 0) return null;

  return (
    <div className="bill-timeline">
      <h3>Timeline</h3>
      <ol>
        {events.map((event) => (
          <li key={event.key} className={event.complete ? 'bill-timeline__event bill-timeline__event--complete' : 'bill-timeline__event'}>
            <time>{formatDateShort(event.date)}</time>
            <span>{event.title}</span>
            <small>{event.meta}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}
