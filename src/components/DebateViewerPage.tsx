import { useAsync } from '../hooks/useAsync';
import { fetchDebateTranscript } from '../api/transcripts';
import { getMemberPhotoUrl } from '../api/oireachtas';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'lucide-react';
import type { Chamber, View } from '../types';
import { viewToHash } from '../utils/routing';
import { ShareModal } from './ShareModal';

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

export function DebateViewerPage({ xmlUri, debateSectionUri, title, focusMemberUri, speechIdx, chamber, houseNo, onBack }: DebateViewerPageProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);

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

  // Extract unique speakers for summary
  const uniqueSpeakers = Array.from(new Set(segments?.map(s => s.speakerName) ?? []));

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {shareUrl && <ShareModal url={shareUrl} onClose={() => { setShareUrl(null); }} />}
      <button
        onClick={onBack}
        style={{ marginBottom: '2rem', padding: '8px 16px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-text-primary)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{title}</h1>

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

      {!loading && !error && segments && segments.length > 0 && (
        <div className="transcript-viewer__content">
          {segments.map((s, idx) => {
            const isFocal = focusMemberUri && s.memberUri === focusMemberUri;
            return (
              <div key={idx} id={`speech-${idx}`} className="transcript-segment" style={{ position: 'relative', display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-start', padding: isFocal ? '1rem' : '0.5rem 0.5rem 0.5rem 0', paddingTop: '0.5rem', backgroundColor: isFocal ? 'rgba(0, 100, 0, 0.05)' : 'transparent', borderRadius: '8px', borderLeft: isFocal ? '4px solid var(--color-accent)' : 'none' }}>
                <button
                  className="card-link-btn"
                  onClick={() => { setShareUrl(buildSegmentShareUrl(s.memberUri, idx)); }}
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
                  {s.paragraphs.map((p, i) => (
                    <p key={i} className="transcript-viewer__paragraph" style={{ marginBottom: '1rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontSize: '1.05rem' }}>{p}</p>
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
