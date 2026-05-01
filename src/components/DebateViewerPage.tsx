import { useAsync } from '../hooks/useAsync';
import { fetchDebateTranscript } from '../api/transcripts';
import { getMemberPhotoUrl } from '../api/oireachtas';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Copy, Link, Quote, Search } from 'lucide-react';
import type { Chamber, View } from '../types';
import { viewToHash } from '../utils/routing';
import { copyText } from '../utils/clipboard';
import { formatDateShort } from '../utils/format';
import { ShareModal } from './ShareModal';
import { SaveButton } from './SaveButton';

interface DebateViewerPageProps {
  xmlUri: string;
  debateSectionUri: string;
  title: string;
  focusMemberUri?: string;
  speechIdx?: number;
  chamber: Chamber;
  houseNo: number;
  onBack: () => void;
  onNavigateMember?: (view: View) => void;
}

function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent.replace(/\s+/g, ' ').trim();
}

function debateDateFromUri(uri: string): string {
  const match = /\/(\d{4}-\d{2}-\d{2})\//.exec(uri);
  return match?.[1] ?? '';
}

function paragraphsToQuote(paragraphs: string[]): string {
  return paragraphs.map(htmlToText).filter(Boolean).join('\n\n');
}

export function DebateViewerPage({ xmlUri, debateSectionUri, title, focusMemberUri, speechIdx, chamber, houseNo, onBack }: DebateViewerPageProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetcher = useCallback((signal: AbortSignal) =>
    fetchDebateTranscript(xmlUri, debateSectionUri, undefined, signal),
    [xmlUri, debateSectionUri]
  );

  const { data: segments, loading, error } = useAsync(fetcher);

  // Scroll to the linked speech segment once transcript has loaded
  useEffect(() => {
    if (!loading && segments && speechIdx !== undefined) {
      const el = document.getElementById(`speech-${speechIdx}`);
      if (el) {
        setTimeout(() => { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
      }
    }
  }, [loading, segments, speechIdx]);

  const buildSegmentShareUrl = (memberUri: string | null, idx: number) =>
    window.location.origin + window.location.pathname +
    viewToHash({ kind: 'debate-viewer', xmlUri, debateSectionUri, title, focusMemberUri: memberUri ?? undefined, speechIdx: idx }, chamber, houseNo);

  const debateDate = debateDateFromUri(xmlUri);

  const copyWithNotice = (id: string, text: string) => {
    copyText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => { setCopiedId(null); }, 1600);
    }).catch(() => {
      setCopiedId(null);
    });
  };

  // Extract unique speakers for summary
  const uniqueSpeakers = useMemo(
    () => Array.from(new Set(segments?.map(s => s.speakerName) ?? [])),
    [segments]
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleSegments = useMemo(() => {
    if (!segments) return [];
    return segments
      .map((segment, idx) => ({ segment, idx }))
      .filter(({ segment }) => {
        if (speakerFilter && segment.speakerName !== speakerFilter) return false;
        if (!normalizedSearch) return true;
        return segment.speakerName.toLowerCase().includes(normalizedSearch) ||
          segment.paragraphs.some((p) => p.toLowerCase().includes(normalizedSearch));
      });
  }, [segments, speakerFilter, normalizedSearch]);

  function highlight(text: string) {
    if (!normalizedSearch) return text;
    const lower = text.toLowerCase();
    const parts: ReactNode[] = [];
    let cursor = 0;
    let idx = lower.indexOf(normalizedSearch);
    while (idx !== -1) {
      if (idx > cursor) parts.push(text.slice(cursor, idx));
      parts.push(<mark key={`${idx}-${cursor}`}>{text.slice(idx, idx + normalizedSearch.length)}</mark>);
      cursor = idx + normalizedSearch.length;
      idx = lower.indexOf(normalizedSearch, cursor);
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {shareUrl && <ShareModal url={shareUrl} onClose={() => { setShareUrl(null); }} />}
      <button
        onClick={onBack}
        style={{ marginBottom: '2rem', padding: '8px 16px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
      >
        ← Back
      </button>

      <div className="record-title-row">
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-text-primary)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{title}</h1>
        <SaveButton
          item={{
            id: `debate:${debateSectionUri}`,
            type: 'debate',
            title,
            subtitle: `${uniqueSpeakers.length} participant${uniqueSpeakers.length !== 1 ? 's' : ''}`,
            urlHash: viewToHash({ kind: 'debate-viewer', xmlUri, debateSectionUri, title }, chamber, houseNo),
            chamber,
            houseNo,
            savedAt: '',
          }}
        />
      </div>

      <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Participants</h3>
        {loading ? (
          <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
        ) : uniqueSpeakers.length > 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{uniqueSpeakers.join(', ')}</p>
        ) : (
          <p style={{ margin: 0, color: 'var(--color-text-tertiary)' }}>No registered speakers found.</p>
        )}
      </div>

      {!loading && !error && segments && segments.length > 0 && (
        <div className="transcript-tools">
          <div className="transcript-tools__search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
              placeholder="Search this transcript..."
            />
          </div>
          <select
            value={speakerFilter}
            onChange={(e) => { setSpeakerFilter(e.target.value); }}
            aria-label="Filter transcript by speaker"
          >
            <option value="">All speakers</option>
            {uniqueSpeakers.map((speaker) => (
              <option key={speaker} value={speaker}>{speaker}</option>
            ))}
          </select>
          <div className="transcript-tools__count">
            {visibleSegments.length} of {segments.length} contribution{segments.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-state" role="status">
          <div className="spinner" aria-hidden="true" />
          <span>Loading official record…</span>
        </div>
      )}

      {error && (
        <div className="error-banner transcript-viewer__error" role="alert">
           {error}
        </div>
      )}

      {!loading && !error && segments && segments.length > 0 && visibleSegments.length === 0 && (
        <div className="empty-state">No transcript contributions match the current filters.</div>
      )}

      {!loading && !error && segments && segments.length > 0 && visibleSegments.length > 0 && (
        <div className="transcript-viewer__content">
          {visibleSegments.map(({ segment: s, idx }) => {
            const isFocal = focusMemberUri && s.memberUri === focusMemberUri;
            const quote = paragraphsToQuote(s.paragraphs);
            const segmentUrl = buildSegmentShareUrl(s.memberUri, idx);
            const citation = `${s.speakerName}, ${title}${debateDate ? `, ${formatDateShort(debateDate)}` : ''}, Houses of the Oireachtas official debate record. ${segmentUrl}`;
            const quoteCopy = `${s.speakerName}: "${quote}"\n\nSource: ${citation}`;
            return (
              <div key={idx} id={`speech-${idx}`} className="transcript-segment" style={{ position: 'relative', display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-start', padding: isFocal ? '1rem' : '0.5rem 0.5rem 0.5rem 0', paddingTop: '0.5rem', backgroundColor: isFocal ? 'rgba(0, 100, 0, 0.05)' : 'transparent', borderRadius: '8px', borderLeft: isFocal ? '4px solid var(--color-accent)' : 'none' }}>
                <button
                  className="card-link-btn"
                  onClick={() => { setShareUrl(segmentUrl); }}
                  aria-label={`Copy link to ${s.speakerName}'s contribution`}
                >
                  <Link size={14} />
                </button>
                <div className="transcript-segment__avatar" style={{ flexShrink: 0, width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
                  {s.memberUri ? (
                    <a href={viewToHash({ kind: 'member', memberUri: s.memberUri, memberName: s.speakerName, constituencyCode: 'all', constituencyName: 'Debate' }, chamber, houseNo)} style={{ display: 'block', width: '100%', height: '100%' }}>
                      <img src={getMemberPhotoUrl(s.memberUri)} alt={s.speakerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </a>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: '1.2rem' }}>M</div>
                  )}
                </div>
                <div className="transcript-segment__body" style={{ flex: 1, minWidth: 0 }}>
                  <strong className="transcript-segment__speaker" style={{ display: 'block', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                    {s.memberUri ? (
                      <a
                        href={viewToHash({ kind: 'member', memberUri: s.memberUri, memberName: s.speakerName, constituencyCode: 'all', constituencyName: 'Debate' }, chamber, houseNo)}
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {s.speakerName}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--color-text-primary)' }}>{s.speakerName}</span>
                    )}
                  </strong>
                  <div className="transcript-segment__actions" aria-label={`Research actions for ${s.speakerName}'s contribution`}>
                    <button type="button" onClick={() => { copyWithNotice(`quote-${idx}`, quoteCopy); }}>
                      <Quote size={14} aria-hidden="true" />
                      {copiedId === `quote-${idx}` ? 'Copied quote' : 'Copy quote'}
                    </button>
                    <button type="button" onClick={() => { copyWithNotice(`cite-${idx}`, citation); }}>
                      <Copy size={14} aria-hidden="true" />
                      {copiedId === `cite-${idx}` ? 'Copied citation' : 'Copy citation'}
                    </button>
                    <SaveButton
                      item={{
                        id: `speech:${debateSectionUri}:${idx}`,
                        type: 'speech',
                        title: `${s.speakerName}: ${title}`,
                        subtitle: quote.slice(0, 140),
                        quote,
                        citation,
                        sourceDate: debateDate,
                        urlHash: viewToHash({ kind: 'debate-viewer', xmlUri, debateSectionUri, title, focusMemberUri: s.memberUri ?? undefined, speechIdx: idx }, chamber, houseNo),
                        chamber,
                        houseNo,
                        savedAt: '',
                      }}
                      className="save-btn--compact"
                    />
                  </div>
                  {s.paragraphs.map((p, i) => (
                    <p key={i} className="transcript-viewer__paragraph" style={{ marginBottom: '1rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontSize: '1.05rem' }}>{highlight(p)}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
