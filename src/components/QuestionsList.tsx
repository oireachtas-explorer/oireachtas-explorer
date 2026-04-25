import { useState, useCallback } from 'react';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { fetchQuestions } from '../api/oireachtas';
import { fetchDebateTranscript } from '../api/transcripts';
import type { Chamber, Question, SpeechSegment } from '../types';
import { formatDateShort } from '../utils/format';

interface QuestionsListProps {
  memberUri: string;
  chamber: Chamber;
  houseNo: number;
}

type RoleFilter = 'all' | 'asked';

const PAGE_SIZE = 20;

function QuestionItem({ q }: { q: Question }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<SpeechSegment[]>([]);

  const handleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (responses.length > 0 || !q.xmlUri || !q.debateSectionUri) return;
    setLoading(true);
    try {
      const transcript = await fetchDebateTranscript(q.xmlUri, q.debateSectionUri);
      const answers = transcript.filter(s => {
        const speakerLower = s.speakerName.toLowerCase();
        const askerLower = q.askedBy.toLowerCase();
        return !(askerLower && speakerLower.includes(askerLower.replace('deputy ', '').trim()));
      });
      setResponses(answers);
    } catch (err) {
      console.error('Failed to load response transcript', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qa-card">
      <div className="qa-header">
        <span className="type-badge">{q.questionType}</span>
        <span className={`role-badge role-badge--${q.role}`}>
          {q.role === 'asked' ? 'Asked' : 'Answered'}
        </span>
        <span className="li-date">{formatDateShort(q.date)}</span>
        {q.department && <span className="qa-dept">{q.department}</span>}
      </div>

      {q.questionText && (
        <div className="qa-section">
          <div className="qa-section-label">Question</div>
          <p className="qa-text">{q.questionText}</p>
        </div>
      )}

      {q.xmlUri && q.debateSectionUri && (
        <div style={{ padding: '0 20px 18px' }}>
          <button
            onClick={() => { void handleExpand(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'transparent', border: 'none', color: 'var(--g700)',
              fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.875rem',
              fontFamily: 'var(--fi)',
            }}
          >
            {expanded ? '▲ Hide Response' : '▼ View Official Response'}
          </button>
        </div>
      )}

      {expanded && (
        <div className="qa-response">
          <div className="qa-section-label qa-section-label--response">Response</div>
          {loading ? (
            <p className="qa-response-text" style={{ color: 'var(--text4)' }}>Loading response…</p>
          ) : responses.length > 0 ? (
            responses.map((r, i) => (
              <div key={i} style={{ marginBottom: i < responses.length - 1 ? 16 : 0 }}>
                <div className="qa-response-meta">
                  <span className="qa-response-from">{r.speakerName}</span>
                </div>
                {r.paragraphs.map((p, j) => (
                  <p key={j} className="qa-response-text" style={{ marginBottom: j < r.paragraphs.length - 1 ? 8 : 0 }}
                    dangerouslySetInnerHTML={{ __html: p }} />
                ))}
              </div>
            ))
          ) : (
            <p className="qa-response-text" style={{ color: 'var(--text4)' }}>No recorded response transcript found.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function QuestionsList({ memberUri, chamber, houseNo }: QuestionsListProps) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const fetcher = useCallback((skip: number, limit: number, signal?: AbortSignal) =>
    fetchQuestions(memberUri, limit, skip, chamber, houseNo, signal), [memberUri, chamber, houseNo]);

  const { items: allQuestions, total, loading, error, loadingMore, handleLoadMore } = usePaginatedList<Question>(fetcher, 'questions', PAGE_SIZE);

  const filtered = roleFilter === 'all' ? allQuestions : allQuestions.filter((q) => q.role === roleFilter);

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <span>Loading questions…</span>
      </div>
    );
  }

  if (error) return <div className="error-banner" role="alert">Failed to load questions: {error}</div>;
  if (allQuestions.length === 0) return <div className="empty-state">No parliamentary questions found.</div>;

  return (
    <>
      <div className="questions-filters" role="group" aria-label="Filter questions by role">
        {(['all', 'asked'] as RoleFilter[]).map((f) => (
          <button key={f} type="button"
            className={`filter-btn ${roleFilter === f ? 'filter-btn--active' : ''}`}
            onClick={() => { setRoleFilter(f); }} aria-pressed={roleFilter === f}>
            {f === 'all' ? 'All' : 'Asked by Member'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text3)', alignSelf: 'center' }}>
          {filtered.length} question{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="question-list">
        {filtered.map((q) => <QuestionItem key={q.uri} q={q} />)}
      </div>

      {allQuestions.length < total && (
        <button className="load-more-btn" onClick={() => { void handleLoadMore(); }} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : `Load more (${total - allQuestions.length} remaining)`}
        </button>
      )}
    </>
  );
}
