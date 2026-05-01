import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { BarChart3, MessagesSquare, Vote, HelpCircle, ScrollText } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { fetchMember, fetchActivitySummary, fetchVoteBreakdown } from '../api/oireachtas';
import { partyColor, formatDate } from '../utils/format';
import { VOTE_DONUT_RADIUS } from '../constants';
import { viewToHash } from '../utils/routing';
import { DebatesList } from './DebatesList';
import { VotesList } from './VotesList';
import { QuestionsList } from './QuestionsList';
import { BillsList } from './BillsList';
import { SaveButton } from './SaveButton';
import type { Chamber, VoteBreakdown, View } from '../types';

type ProfileTab = 'overview' | 'debates' | 'votes' | 'questions' | 'legislation';

interface MemberProfileProps {
  memberUri: string;
  constituencyName: string;
  chamber: Chamber;
  houseNo: number;
  onBack: () => void;
  onNavigate: (view: View) => void;
}

function memberSince(memberCode: string): string {
  const parts = memberCode.split('.');
  const datePart = parts[parts.length - 1];
  return datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? formatDate(datePart) : '—';
}

function VoteDonut({ breakdown }: { breakdown: VoteBreakdown }) {
  const { ta, nil, staon } = breakdown;
  const total = ta + nil + staon;
  if (total === 0) return null;

  const radius = VOTE_DONUT_RADIUS;
  const circumference = 2 * Math.PI * radius;
  const taLen = (ta / total) * circumference;
  const nilLen = (nil / total) * circumference;
  const staonLen = (staon / total) * circumference;

  return (
    <div className="vote-donut">
      <svg viewBox="0 0 100 100" className="vote-donut__svg" role="img"
        aria-label={`${total} total votes: ${ta} Tá, ${nil} Níl, ${staon} Staon`}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="12" />
        <circle cx="50" cy="50" r={radius} fill="none"
          stroke="var(--color-vote-for)" strokeWidth="12"
          strokeDasharray={`${taLen} ${circumference - taLen}`}
          strokeDashoffset={circumference / 4} strokeLinecap="round" />
        <circle cx="50" cy="50" r={radius} fill="none"
          stroke="var(--color-vote-against)" strokeWidth="12"
          strokeDasharray={`${nilLen} ${circumference - nilLen}`}
          strokeDashoffset={circumference / 4 - taLen} strokeLinecap="round" />
        <circle cx="50" cy="50" r={radius} fill="none"
          stroke="var(--color-vote-abstain)" strokeWidth="12"
          strokeDasharray={`${staonLen} ${circumference - staonLen}`}
          strokeDashoffset={circumference / 4 - taLen - nilLen} strokeLinecap="round" />
        <text x="50" y="48" textAnchor="middle" className="vote-donut__total">{total}</text>
        <text x="50" y="60" textAnchor="middle" className="vote-donut__label">votes</text>
      </svg>
      <div className="vote-donut__legend">
        <span className="vote-donut__legend-item">
          <span className="vote-donut__dot vote-donut__dot--ta" />Tá {ta}
        </span>
        <span className="vote-donut__legend-item">
          <span className="vote-donut__dot vote-donut__dot--nil" />Níl {nil}
        </span>
        <span className="vote-donut__legend-item">
          <span className="vote-donut__dot vote-donut__dot--staon" />Staon {staon}
        </span>
      </div>
    </div>
  );
}

const TAB_CONFIG: { key: ProfileTab; label: string; Icon: typeof BarChart3 }[] = [
  { key: 'overview', label: 'Overview', Icon: BarChart3 },
  { key: 'debates', label: 'Debates', Icon: MessagesSquare },
  { key: 'votes', label: 'Votes', Icon: Vote },
  { key: 'questions', label: 'Questions', Icon: HelpCircle },
  { key: 'legislation', label: 'Legislation', Icon: ScrollText },
];

export function MemberProfile({ memberUri, constituencyName, chamber, houseNo, onBack, onNavigate }: MemberProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [photoFailed, setPhotoFailed] = useState(false);
  const tabRefs = useRef<Record<ProfileTab, HTMLButtonElement | null>>({
    overview: null, debates: null, votes: null, questions: null, legislation: null,
  });

  const handleTabKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % TAB_CONFIG.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TAB_CONFIG.length) % TAB_CONFIG.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TAB_CONFIG.length - 1;
    else return;
    e.preventDefault();
    const nextKey = TAB_CONFIG[next].key;
    setActiveTab(nextKey);
    tabRefs.current[nextKey]?.focus();
  }, []);

  const fetchMemberCb = useCallback((signal: AbortSignal) => fetchMember(memberUri, chamber, houseNo, signal), [memberUri, chamber, houseNo]);
  const { data: member, loading, error } = useAsync(fetchMemberCb);

  const fetchSummaryCb = useCallback((signal: AbortSignal) => fetchActivitySummary(memberUri, chamber, houseNo, signal), [memberUri, chamber, houseNo]);
  const { data: summary } = useAsync(fetchSummaryCb);

  const fetchBreakdownCb = useCallback((signal: AbortSignal) => fetchVoteBreakdown(memberUri, chamber, houseNo, signal), [memberUri, chamber, houseNo]);
  const { data: voteBreakdown, loading: breakdownLoading } = useAsync(fetchBreakdownCb);

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <span>Loading member details…</span>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="container">
        <button className="back-btn" onClick={onBack} aria-label="Back to previous page">← Back</button>
        <div className="error-banner" role="alert">{error ?? 'Member not found.'}</div>
      </div>
    );
  }

  const color = partyColor(member.party);
  const since = memberSince(member.memberCode);

  return (
    <div className="page">
      <div className="profile-page">
        <button className="back-btn" onClick={onBack} aria-label={`Back to ${constituencyName} members`}>
          ← Back to {constituencyName}
        </button>

        <div className="profile-layout">
          {/* Sticky sidebar */}
          <aside className="profile-sidebar">
            <div className="profile-sidebar-stripe" style={{ background: color }} />
            <div className="profile-sidebar-body">
              <div className="profile-photo-wrap">
                {!photoFailed ? (
                  <img src={member.photoUrl} alt={member.fullName} loading="lazy" decoding="async"
                    className="profile-photo" onError={() => { setPhotoFailed(true); }} />
                ) : (
                  <div className="profile-initials">{member.firstName[0]}{member.lastName[0]}</div>
                )}
              </div>
              <div className="profile-name">{member.fullName}</div>
              <SaveButton
                item={{
                  id: `member:${member.uri}`,
                  type: 'member',
                  title: member.fullName,
                  subtitle: `${member.party} · ${member.constituency || constituencyName}`,
                  urlHash: viewToHash({ kind: 'member', memberUri, memberName: member.fullName, constituencyCode: member.constituencyCode, constituencyName: member.constituency || constituencyName }, chamber, houseNo),
                  chamber,
                  houseNo,
                  savedAt: '',
                }}
                className="save-btn--wide"
              />
              <div className="profile-meta">
                <span className="party-badge" style={{ backgroundColor: color }}>{member.party}</span>
              </div>
              <div className="profile-cst">{member.constituency || constituencyName}</div>
              {member.offices.length > 0 && member.offices.map((o, i) => (
                <a key={i} className="profile-office-badge"
                  href={viewToHash({ kind: 'offices' }, chamber, houseNo)}
                  onClick={(e) => { e.preventDefault(); onNavigate({ kind: 'offices' }); }}
                  style={{ textDecoration: 'none', cursor: 'pointer', display: 'inline-block' }}>
                  {o.name}
                </a>
              ))}
              <hr className="profile-divider" />
              <div className="profile-since-lbl">Member Since</div>
              <div className="profile-since-val">{since}</div>
              {summary && (
                <div className="profile-stats">
                  {[
                    ['Debates', summary.totalDebates, 'debates'],
                    ['Votes', summary.totalVotes, 'votes'],
                    ['Questions', summary.totalQuestions, 'questions'],
                    ['Bills', summary.totalBills, 'legislation'],
                  ].map(([lbl, num, tab]) => (
                    <button key={lbl as string} className="profile-stat"
                      onClick={() => { setActiveTab(tab as ProfileTab); }}
                      style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
                      <span className="profile-stat-num">{num}</span>
                      <span className="profile-stat-lbl">{lbl}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main content */}
          <div className="profile-main">
            <div className="tab-bar" role="tablist" aria-label="Member activity sections">
              {TAB_CONFIG.map(({ key, label, Icon }, index) => {
                const selected = activeTab === key;
                return (
                  <button key={key}
                    ref={(el) => { tabRefs.current[key] = el; }}
                    id={`tab-${key}`}
                    className={`tab-btn ${selected ? 'tab-btn--active' : ''}`}
                    onClick={() => { setActiveTab(key); }}
                    onKeyDown={(e) => { handleTabKeyDown(e, index); }}
                    role="tab" type="button"
                    aria-selected={selected}
                    aria-controls={`tabpanel-${key}`}
                    tabIndex={selected ? 0 : -1}>
                    <Icon className="tab-btn__icon" size={16} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="tab-content" role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={0}>

              {activeTab === 'overview' && (
                <div>
                  {/* Overview info cards */}
                  <div className="overview-grid" style={{ marginBottom: 24 }}>
                    <div className="overview-card">
                      <div className="overview-card__label">Party</div>
                      <div className="overview-card__value">
                        <a href={viewToHash({ kind: 'party', partyName: member.party }, chamber, houseNo)}
                          style={{ color: 'var(--g700)', textDecoration: 'none', fontWeight: 600 }}>
                          {member.party}
                        </a>
                      </div>
                    </div>
                    <div className="overview-card">
                      <div className="overview-card__label">Constituency</div>
                      <div className="overview-card__value">
                        <a href={viewToHash({ kind: 'members', constituencyCode: member.constituencyCode, constituencyName: member.constituency || constituencyName }, chamber, houseNo)}
                          style={{ color: 'var(--g700)', textDecoration: 'none', fontWeight: 600 }}>
                          {member.constituency || constituencyName}
                        </a>
                      </div>
                    </div>
                  </div>

                  {member.committees && member.committees.length > 0 && (
                    <>
                      <h3 className="overview-subtitle">Committee Memberships</h3>
                      <ul className="committee-list">
                        {member.committees.map((c) => (
                          <li key={c.uri} className="committee-item">
                            <a href={viewToHash({ kind: 'committee', committeeUri: c.uri, committeeName: c.name }, chamber, houseNo)}
                              className="committee-item__name committee-item__name--link"
                              onClick={(e) => { e.preventDefault(); onNavigate({ kind: 'committee', committeeUri: c.uri, committeeName: c.name }); }}>
                              {c.name}
                            </a>
                            <span className="committee-item__role">{c.role}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {summary && (
                    <>
                      <h3 className="overview-subtitle">Voting Breakdown</h3>
                      {voteBreakdown ? (
                        <VoteDonut breakdown={voteBreakdown} />
                      ) : breakdownLoading ? (
                        <div className="loading-state" role="status">
                          <div className="spinner" aria-hidden="true" />
                          <span>Loading voting breakdown…</span>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'debates' && <DebatesList memberUri={memberUri} chamber={chamber} houseNo={houseNo} />}
              {activeTab === 'votes' && <VotesList memberUri={memberUri} chamber={chamber} houseNo={houseNo} />}
              {activeTab === 'questions' && <QuestionsList memberUri={memberUri} chamber={chamber} houseNo={houseNo} />}
              {activeTab === 'legislation' && <BillsList memberUri={memberUri} chamber={chamber} houseNo={houseNo} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
