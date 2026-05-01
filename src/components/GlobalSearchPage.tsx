import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { fetchGlobalDebates, fetchGlobalLegislation, fetchGlobalQuestions } from '../api/oireachtas';
import { useAsync } from '../hooks/useAsync';
import type { Bill, Chamber, Debate, Member, Question, View } from '../types';
import { formatDateShort } from '../utils/format';
import { viewToHash } from '../utils/routing';

interface GlobalSearchPageProps {
  initialQuery?: string;
  chamber: Chamber;
  houseNo: number;
  allMembers: Member[];
  loadingAllMembers: boolean;
  onNavigate: (view: View) => void;
  onBack: () => void;
}

type ResultType = 'all' | 'members' | 'debates' | 'bills' | 'questions';

function includes(text: string | undefined, term: string): boolean {
  return (text ?? '').toLowerCase().includes(term);
}

export function GlobalSearchPage({
  initialQuery,
  chamber,
  houseNo,
  allMembers,
  loadingAllMembers,
  onNavigate,
  onBack,
}: GlobalSearchPageProps) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [submitted, setSubmitted] = useState(initialQuery ?? '');
  const [type, setType] = useState<ResultType>('all');

  const term = submitted.trim().toLowerCase();
  const hasSubmittedTerm = term.length > 0;

  useEffect(() => {
    setQuery(initialQuery ?? '');
    setSubmitted(initialQuery ?? '');
  }, [initialQuery, chamber, houseNo]);

  const debatesFetcher = useCallback((signal: AbortSignal) =>
    fetchGlobalDebates(80, 0, chamber, houseNo, '', undefined, undefined, signal),
  [chamber, houseNo]);
  const { data: debatesData, loading: loadingDebates } = useAsync(debatesFetcher, { enabled: hasSubmittedTerm });

  const billsFetcher = useCallback((signal: AbortSignal) =>
    fetchGlobalLegislation(120, 0, chamber, houseNo, signal),
  [chamber, houseNo]);
  const { data: billsData, loading: loadingBills } = useAsync(billsFetcher, { enabled: hasSubmittedTerm });

  const questionsFetcher = useCallback((signal: AbortSignal) =>
    fetchGlobalQuestions(80, 0, chamber, houseNo, signal),
  [chamber, houseNo]);
  const { data: questionsData, loading: loadingQuestions } = useAsync(questionsFetcher, { enabled: hasSubmittedTerm });

  const memberResults = useMemo(() => {
    if (!term) return [];
    return allMembers.filter((m) =>
      includes(m.fullName, term) ||
      includes(m.party, term) ||
      includes(m.constituency, term) ||
      m.offices.some((office) => includes(office.name, term)) ||
      (m.committees ?? []).some((committee) => includes(committee.name, term))
    ).slice(0, 20);
  }, [allMembers, term]);

  const debateResults = useMemo(() => {
    if (!term) return [];
    const debates = debatesData?.debates ?? [];
    return debates.filter((d) =>
      includes(d.title, term) ||
      includes(d.chamber, term) ||
      d.sections.some((section) => includes(section.title, term)) ||
      includes(d.date, term)
    ).slice(0, 20);
  }, [debatesData, term]);

  const billResults = useMemo(() => {
    if (!term) return [];
    const bills = billsData?.bills ?? [];
    return bills.filter((b) =>
      includes(b.title, term) ||
      includes(b.longTitleEn, term) ||
      includes(b.status, term) ||
      includes(b.source, term) ||
      b.sponsors.some((sponsor) => includes(sponsor, term))
    ).slice(0, 20);
  }, [billsData, term]);

  const questionResults = useMemo(() => {
    if (!term) return [];
    const questions = questionsData?.questions ?? [];
    return questions.filter((q) =>
      includes(q.questionText, term) ||
      includes(q.askedBy, term) ||
      includes(q.department, term) ||
      includes(q.questionType, term)
    ).slice(0, 20);
  }, [questionsData, term]);

  const totalResults = memberResults.length + debateResults.length + billResults.length + questionResults.length;
  const loading = loadingAllMembers || loadingDebates || loadingBills || loadingQuestions;

  const submit = () => {
    const next = query.trim();
    setSubmitted(next);
    if (next) {
      window.location.hash = viewToHash({ kind: 'search', query: next }, chamber, houseNo);
    }
  };

  const show = (resultType: ResultType) => type === 'all' || type === resultType;

  return (
    <div className="container">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="member-grid-page__header">
        <h1 className="section-heading">Global Search</h1>
        <p className="section-subheading">Search loaded members, recent debates, legislation, and parliamentary questions for this session.</p>
      </div>

      <div className="global-search-box">
        <Search size={18} aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Search names, topics, bills, parties, offices..."
          autoFocus
        />
        <button type="button" onClick={submit}>Search</button>
      </div>

      <div className="type-filters" style={{ marginTop: 18 }}>
        {(['all', 'members', 'debates', 'bills', 'questions'] as ResultType[]).map((value) => (
          <button
            key={value}
            className={`type-filter-btn${type === value ? ' type-filter-btn--active' : ''}`}
            onClick={() => { setType(value); }}
            type="button"
          >
            {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {!term ? (
        <div className="empty-state">Enter a term to search across the parliamentary record.</div>
      ) : loading ? (
        <div className="loading-state" role="status">
          <div className="spinner" aria-hidden="true" />
          <span>Searching records...</span>
        </div>
      ) : totalResults === 0 ? (
        <div className="empty-state">No matches found in the currently loaded record sample.</div>
      ) : (
        <div className="search-results">
          {show('members') && <SearchSection title="Members" count={memberResults.length}>
            {memberResults.map((m) => (
              <button
                key={m.uri}
                className="search-result-card"
                onClick={() => { onNavigate({ kind: 'member', memberUri: m.uri, memberName: m.fullName, constituencyCode: m.constituencyCode, constituencyName: m.constituency }); }}
              >
                <span className="search-result-card__title">{m.fullName}</span>
                <span className="search-result-card__meta">{m.party} · {m.constituency}</span>
              </button>
            ))}
          </SearchSection>}

          {show('debates') && <SearchSection title="Debates" count={debateResults.length}>
            {debateResults.map((d: Debate) => (
              <button
                key={d.uri}
                className="search-result-card"
                onClick={() => {
                  if (d.xmlUri && (d.debateSectionUri ?? d.sections[0]?.uri)) {
                    onNavigate({ kind: 'debate-viewer', xmlUri: d.xmlUri, debateSectionUri: d.debateSectionUri ?? d.sections[0].uri, title: d.title });
                  }
                }}
              >
                <span className="search-result-card__title">{d.title}</span>
                <span className="search-result-card__meta">{formatDateShort(d.date)} · {d.chamber}</span>
              </button>
            ))}
          </SearchSection>}

          {show('bills') && <SearchSection title="Bills" count={billResults.length}>
            {billResults.map((b: Bill) => (
              <button
                key={b.uri}
                className="search-result-card"
                onClick={() => { onNavigate({ kind: 'bill-viewer', billNo: b.billNo, billYear: b.billYear }); }}
              >
                <span className="search-result-card__title">{b.title}</span>
                <span className="search-result-card__meta">Bill {b.billNo} of {b.billYear} · {b.status}</span>
              </button>
            ))}
          </SearchSection>}

          {show('questions') && <SearchSection title="Questions" count={questionResults.length}>
            {questionResults.map((q: Question) => (
              <a
                key={q.uri}
                className="search-result-card"
                href={q.xmlUri && q.debateSectionUri
                  ? viewToHash({ kind: 'debate-viewer', xmlUri: q.xmlUri, debateSectionUri: q.debateSectionUri, title: q.questionText.slice(0, 80) || 'Parliamentary Question' }, chamber, houseNo)
                  : viewToHash({ kind: 'search', query: submitted }, chamber, houseNo)}
              >
                <span className="search-result-card__title">{q.questionText || `Question ${q.questionNumber}`}</span>
                <span className="search-result-card__meta">{formatDateShort(q.date)} · {q.department || q.questionType}</span>
              </a>
            ))}
          </SearchSection>}
        </div>
      )}
    </div>
  );
}

function SearchSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="search-section">
      <div className="section-hd">
        <div className="section-title">{title}</div>
        <div className="section-sub">{count} match{count !== 1 ? 'es' : ''}</div>
      </div>
      <div className="search-section__grid">{children}</div>
    </section>
  );
}
