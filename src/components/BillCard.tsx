import { useEffect, useState } from 'react';
import { Link } from 'lucide-react';
import type { Bill, Chamber, Member } from '../types';
import { formatDateShort, billStatusLabel, billStatusClass } from '../utils/format';
import { viewToHash } from '../utils/routing';
import { sponsorProfileHash } from '../utils/sponsors';
import { ShareModal } from './ShareModal';

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
  const ordered = ['First Stage', 'Second Stage', 'Committee Stage', 'Report Stage', 'Fifth Stage', 'Passed', 'Signed'];
  const current = bill.currentStage;
  const currentIdx = ordered.findIndex((stage) => stage === current || current.includes(stage.split(' ')[0]));

  if (currentIdx < 0) return [];

  return ordered.slice(0, Math.min(currentIdx + 2, ordered.length)).map((stage, index) => ({
    name: shortStage(stage),
    done: index < currentIdx || bill.status.toLowerCase() === 'enacted',
    current: index === currentIdx && bill.status.toLowerCase() !== 'enacted',
  }));
}

function BillStagebar({ stages }: { stages: StageNode[] }) {
  if (!stages.length) return null;
  const doneCount = stages.filter((stage) => stage.done).length;
  const currentIdx = stages.findIndex((stage) => stage.current);
  const fillPos = currentIdx >= 0 ? currentIdx : doneCount - 1;
  const allDone = stages.every((stage) => stage.done);
  const fillPct = allDone ? 100 : stages.length <= 1 ? 0 : Math.max(0, (fillPos / (stages.length - 1)) * 100);

  return (
    <div className="stage-bar-wrap">
      <div className="stage-track">
        <div className={`stage-track-fill${allDone ? ' stage-track-fill--complete' : ''}`} style={{ width: `${fillPct}%` }} />
        <div className="stage-nodes">
          {stages.map((stage, index) => (
            <div
              key={index}
              className={`stage-dot-node${stage.done ? ' stage-dot-node--done' : ''}${stage.current ? ' stage-dot-node--current' : ''}`}
              title={stage.name}
            />
          ))}
        </div>
      </div>
      <div className="stage-labels">
        {stages.map((stage, index) => (
          <div key={index} className={`stage-lbl${stage.done ? ' stage-lbl--done' : ''}${stage.current ? ' stage-lbl--current' : ''}`}>
            {stage.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function billPdfUrl(bill: Bill): string {
  return bill.versions?.find((version) => version.pdfUri)?.pdfUri
    ?? bill.relatedDocs?.find((doc) => doc.pdfUri)?.pdfUri
    ?? '';
}

function PdfModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const [failed, setFailed] = useState(false);
  const pdfUrl = billPdfUrl(bill);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); };
  }, [onClose]);

  return (
    <div className="pdf-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
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
              <div className="pdf-fallback-icon">PDF</div>
              <div className="pdf-fallback-title">{bill.title}</div>
              <div className="pdf-fallback-sub">
                The PDF cannot be embedded directly. Open it in a new tab to view the full bill.
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
                Open Full Bill PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BillCardProps {
  bill: Bill;
  chamber: Chamber;
  houseNo: number;
  animationIndex?: number;
  showDetailsLink?: boolean;
  allMembers?: Member[];
  collapsibleSummary?: boolean;
}

export function BillCard({ bill, chamber, houseNo, animationIndex = 0, showDetailsLink = false, allMembers, collapsibleSummary = false }: BillCardProps) {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const stages = buildStages(bill);
  const hasPdf = billPdfUrl(bill) !== '';
  const detailHash = viewToHash({ kind: 'bill-viewer', billNo: bill.billNo, billYear: bill.billYear }, chamber, houseNo);

  return (
    <>
      {pdfOpen && <PdfModal bill={bill} onClose={() => { setPdfOpen(false); }} />}
      {shareOpen && <ShareModal url={window.location.origin + window.location.pathname + detailHash} onClose={() => { setShareOpen(false); }} />}

      <div className="bill-card" style={{ animationDelay: `${animationIndex * 0.05}s`, position: 'relative' }}>
        <button className="card-link-btn" onClick={() => { setShareOpen(true); }} aria-label={`Copy link to ${bill.title}`}>
          <Link size={14} />
        </button>
        <div className="bill-card-badges">
          <span className={`bill-status-badge ${billStatusClass(bill.status)}`}>
            {billStatusLabel(bill.status)}
          </span>
          {bill.source && <span className="bill-sponsor-badge">{bill.source}</span>}
          <span className="li-date" style={{ marginLeft: 'auto' }}>{formatDateShort(bill.lastUpdated)}</span>
        </div>
        <div className="bill-card-title">{bill.title}</div>
        {bill.longTitleEn ? (
          <div className="bill-card-summary">
            <div
              className={`bill-card-longtitle${collapsibleSummary && !summaryExpanded ? ' bill-card-longtitle--collapsed' : ''}`}
              dangerouslySetInnerHTML={{ __html: bill.longTitleEn }}
            />
            {collapsibleSummary && (
              <button
                type="button"
                className="bill-card-summary-toggle"
                onClick={() => { setSummaryExpanded((expanded) => !expanded); }}
                aria-expanded={summaryExpanded}
              >
                {summaryExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        ) : bill.currentStage ? (
          <div className="bill-card-longtitle">
            {bill.currentStage}{bill.originHouse ? ` · ${bill.originHouse}` : ''}
          </div>
        ) : null}
        {bill.currentStage && <div className="bill-card-stage">Current stage: {bill.currentStage}</div>}
        {stages.length > 0 && <BillStagebar stages={stages} />}
        <div className="bill-card-actions">
          {hasPdf && (
            <button className="bill-pdf-btn" onClick={() => { setPdfOpen(true); }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              View Bill PDF
            </button>
          )}
          {showDetailsLink && (
            <a className="bill-ext-link" href={detailHash}>
              View in app
            </a>
          )}
          {bill.sponsors.length > 0 && (
            <span className="bill-card-sponsors">
              Sponsors: {bill.sponsors.map((sponsor, index) => {
                const href = sponsorProfileHash(sponsor, allMembers, chamber, houseNo);
                return (
                  <span key={`${sponsor.name}:${sponsor.uri ?? index}`}>
                    {index > 0 ? ', ' : ''}
                    {href ? <a href={href}>{sponsor.name}</a> : sponsor.name}
                  </span>
                );
              })}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
