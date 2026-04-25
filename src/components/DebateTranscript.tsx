import { useCallback } from 'react';
import { useAsync } from '../hooks/useAsync';
import { fetchDebateTranscript } from '../api/transcripts';
import { getMemberPhotoUrl } from '../api/oireachtas';

interface DebateTranscriptProps {
  xmlUri: string;
  debateSectionUri: string;
  memberUri: string;
  onClose: () => void;
}

export function DebateTranscript({ xmlUri, debateSectionUri, memberUri, onClose }: DebateTranscriptProps) {
  const fetcher = useCallback((signal: AbortSignal) => 
    fetchDebateTranscript(xmlUri, debateSectionUri, memberUri, signal), 
    [xmlUri, debateSectionUri, memberUri]
  );
  
  const { data: segments, loading, error } = useAsync(fetcher);

  return (
    <div className="transcript-viewer">
      <div className="transcript-viewer__header">
        <h4 className="transcript-viewer__title">Official Transcript</h4>
        <button className="transcript-viewer__close" onClick={onClose} aria-label="Close transcript">✕</button>
      </div>
      
      {loading && (
        <div className="loading-state--small" role="status">
          <div className="spinner" aria-hidden="true" />
          <span>Loading official record…</span>
        </div>
      )}
      
      {error && (
        <div className="error-banner transcript-viewer__error" role="alert">
          <span>{error}</span>
          <a
            className="transcript-viewer__fallback-link"
            href={xmlUri}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open XML source ↗
          </a>
        </div>
      )}
      
      {!loading && !error && segments?.length === 0 && (
         <div className="empty-state--small">
           No matching spoken record could be extracted for this section.
         </div>
      )}

      {!loading && !error && segments && segments.length > 0 && (
        <div className="transcript-viewer__content">
          {segments.map((s, idx) => (
            <div key={idx} className="transcript-segment">
              <div className="transcript-segment__avatar">
                {s.memberUri ? (
                  <img src={getMemberPhotoUrl(s.memberUri)} alt="" loading="lazy" />
                ) : (
                  <span aria-hidden="true">M</span>
                )}
              </div>
              <div className="transcript-segment__body">
                <strong className="transcript-segment__speaker">{s.speakerName}</strong>
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="transcript-viewer__paragraph">{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
