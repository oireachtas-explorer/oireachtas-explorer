import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Scale } from 'lucide-react';
import { fetchActivitySummary, fetchVoteBreakdown } from '../api/oireachtas';
import { useAsync } from '../hooks/useAsync';
import type { ActivitySummary, Chamber, Member, VoteBreakdown, View } from '../types';
import { formatDateShort, partyColor } from '../utils/format';
import { getHouseDateRange, getHousePresetYearRange } from '../utils/dail';

interface CompareMembersPageProps {
  chamber: Chamber;
  houseNo: number;
  allMembers: Member[];
  loadingAllMembers: boolean;
  onNavigate: (view: View) => void;
  onBack: () => void;
}

export function CompareMembersPage({
  chamber,
  houseNo,
  allMembers,
  loadingAllMembers,
  onNavigate,
  onBack,
}: CompareMembersPageProps) {
  const [memberQuery, setMemberQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const houseRange = useMemo(() => getHouseDateRange(chamber, houseNo), [chamber, houseNo]);
  const yearPresetRange = useMemo(() => getHousePresetYearRange(chamber, houseNo), [chamber, houseNo]);
  const [dateStart, setDateStart] = useState(houseRange.start);
  const [dateEnd, setDateEnd] = useState(houseRange.end);

  useEffect(() => {
    setDateStart(houseRange.start);
    setDateEnd(houseRange.end);
  }, [houseRange]);

  const sortedMembers = useMemo(() =>
    [...allMembers].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
  [allMembers]);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedMembers = selected
    .map((uri) => allMembers.find((member) => member.uri === uri))
    .filter((member): member is Member => Boolean(member));

  const addMember = (uri: string) => {
    if (!uri || selected.includes(uri) || selected.length >= 3) return;
    setSelected((prev) => [...prev, uri]);
    setMemberQuery('');
    setActiveIndex(0);
    setPickerOpen(false);
    inputRef.current?.focus();
  };

  const removeMember = (uri: string) => {
    setSelected((prev) => prev.filter((item) => item !== uri));
  };

  const availableMembers = useMemo(() => {
    const term = memberQuery.trim().toLowerCase();
    return sortedMembers
      .filter((member) => !selected.includes(member.uri))
      .filter((member) => {
        if (!term) return true;
        return member.fullName.toLowerCase().includes(term) ||
          member.lastName.toLowerCase().includes(term) ||
          member.firstName.toLowerCase().includes(term) ||
          member.party.toLowerCase().includes(term) ||
          member.constituency.toLowerCase().includes(term);
      })
      .slice(0, 12);
  }, [memberQuery, selected, sortedMembers]);

  const pickerDisabled = loadingAllMembers || selected.length >= 3;
  const hasQuery = memberQuery.trim().length > 0;
  const showPickerResults = !pickerDisabled && pickerOpen && hasQuery && availableMembers.length > 0;
  const effectiveStart = dateStart || houseRange.start;
  const effectiveEnd = dateEnd || houseRange.end;

  const setFullTerm = () => {
    setDateStart(houseRange.start);
    setDateEnd(houseRange.end);
  };

  const setCurrentYear = () => {
    setDateStart(yearPresetRange.start);
    setDateEnd(yearPresetRange.end);
  };

  const setLastNinetyDays = () => {
    const end = houseRange.end;
    const startDate = new Date(`${end}T00:00:00Z`);
    startDate.setDate(startDate.getDate() - 90);
    setDateStart(maxDate(startDate.toISOString().split('T')[0], houseRange.start));
    setDateEnd(end);
  };

  return (
    <div className="container">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="member-grid-page__header">
        <h1 className="section-heading">Compare Members</h1>
        <p className="section-subheading">Compare up to three members by activity, votes, constituency, offices, and committees.</p>
      </div>

      <div className="compare-controls">
        <div className="compare-picker">
          <div className="compare-picker__input-wrap">
            <Search size={16} aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={memberQuery}
              disabled={pickerDisabled}
              placeholder={loadingAllMembers ? 'Loading members...' : selected.length >= 3 ? 'Remove a member to add another' : 'Type a name, party, or constituency...'}
              aria-label="Search members to compare"
              aria-expanded={showPickerResults}
              aria-controls="compare-member-results"
              onFocus={() => { if (hasQuery) setPickerOpen(true); }}
              onBlur={() => {
                window.setTimeout(() => { setPickerOpen(false); }, 100);
              }}
              onChange={(e) => {
                setMemberQuery(e.target.value);
                setActiveIndex(0);
                setPickerOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex((idx) => Math.min(idx + 1, availableMembers.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((idx) => Math.max(idx - 1, 0));
                } else if (e.key === 'Enter' && availableMembers[activeIndex]) {
                  e.preventDefault();
                  addMember(availableMembers[activeIndex].uri);
                } else if (e.key === 'Escape') {
                  setMemberQuery('');
                  setActiveIndex(0);
                  setPickerOpen(false);
                }
              }}
            />
          </div>
          <div className="compare-picker__hint">
            Ordered by surname. Filter by name, party, or constituency.
          </div>
          {showPickerResults && (
            <div id="compare-member-results" className="compare-picker__results" role="listbox" aria-label="Matching members">
              {availableMembers.map((member, index) => (
                <button
                  key={member.uri}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`compare-picker__result${index === activeIndex ? ' compare-picker__result--active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); }}
                  onMouseEnter={() => { setActiveIndex(index); }}
                  onClick={() => { addMember(member.uri); }}
                >
                  <span className="compare-picker__name">{member.lastName}, {member.firstName}</span>
                  <span className="compare-picker__meta">{member.party} · {member.constituency}</span>
                </button>
              ))}
            </div>
          )}
          {!pickerDisabled && hasQuery && pickerOpen && availableMembers.length === 0 && (
            <div className="compare-picker__empty">No matching members found.</div>
          )}
        </div>

        <div className="compare-date-filter">
          <div className="compare-date-filter__header">
            <span>Comparison Period</span>
            <small>{formatDateShort(effectiveStart)} to {formatDateShort(effectiveEnd)}</small>
          </div>
          <div className="compare-date-filter__inputs">
            <label>
              From
              <input
                type="date"
                min={houseRange.start}
                max={effectiveEnd}
                value={dateStart}
                onChange={(e) => { setDateStart(e.target.value); }}
              />
            </label>
            <label>
              To
              <input
                type="date"
                min={effectiveStart}
                max={houseRange.end}
                value={dateEnd}
                onChange={(e) => { setDateEnd(e.target.value); }}
              />
            </label>
          </div>
          <div className="compare-date-filter__presets" role="group" aria-label="Comparison period presets">
            <button type="button" onClick={setFullTerm}>Full term</button>
            <button type="button" onClick={setCurrentYear}>
              {yearPresetRange.end.slice(0, 4) === new Date().toISOString().slice(0, 4) ? 'This year' : 'Latest year'}
            </button>
            <button type="button" onClick={setLastNinetyDays}>Last 90 days</button>
          </div>
        </div>
      </div>

      {selectedMembers.length === 0 ? (
        <div className="empty-state">
          <Scale className="empty-state__icon" size={40} aria-hidden="true" />
          <p>Select members to compare their parliamentary activity side by side.</p>
        </div>
      ) : (
        <div className="compare-grid">
          {selectedMembers.map((member) => (
            <CompareMemberCard
              key={member.uri}
              member={member}
              chamber={chamber}
              houseNo={houseNo}
              dateStart={effectiveStart}
              dateEnd={effectiveEnd}
              onRemove={() => { removeMember(member.uri); }}
              onOpen={() => {
                onNavigate({
                  kind: 'member',
                  memberUri: member.uri,
                  memberName: member.fullName,
                  constituencyCode: member.constituencyCode,
                  constituencyName: member.constituency,
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompareMemberCard({
  member,
  chamber,
  houseNo,
  dateStart,
  dateEnd,
  onRemove,
  onOpen,
}: {
  member: Member;
  chamber: Chamber;
  houseNo: number;
  dateStart: string;
  dateEnd: string;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const summaryFetcher = useCallback((signal: AbortSignal) =>
    fetchActivitySummary(member.uri, chamber, houseNo, signal, dateStart, dateEnd),
  [member.uri, chamber, houseNo, dateStart, dateEnd]);
  const { data: summary, loading: loadingSummary } = useAsync<ActivitySummary>(summaryFetcher);

  const votesFetcher = useCallback((signal: AbortSignal) =>
    fetchVoteBreakdown(member.uri, chamber, houseNo, signal, dateStart, dateEnd),
  [member.uri, chamber, houseNo, dateStart, dateEnd]);
  const { data: votes, loading: loadingVotes } = useAsync<VoteBreakdown>(votesFetcher);

  const voteTotal = votes ? votes.ta + votes.nil + votes.staon : 0;

  return (
    <article className="compare-card">
      <div className="compare-card__stripe" style={{ backgroundColor: partyColor(member.party) }} />
      <div className="compare-card__header">
        <img src={member.photoUrl} alt={member.fullName} loading="lazy" />
        <div>
          <h2>{member.fullName}</h2>
          <div className="compare-card__meta">{member.party} · {member.constituency}</div>
        </div>
      </div>

      <div className="compare-card__actions">
        <button type="button" onClick={onOpen}>Open profile</button>
        <button type="button" onClick={onRemove}>Remove</button>
      </div>
      <div className="compare-card__period">{formatDateShort(dateStart)} to {formatDateShort(dateEnd)}</div>

      <div className="compare-metrics">
        {loadingSummary ? (
          <div className="compare-card__loading">Loading activity...</div>
        ) : summary ? (
          <>
            <Metric label="Debates" value={summary.totalDebates} />
            <Metric label="Votes" value={summary.totalVotes} />
            <Metric label="Questions" value={summary.totalQuestions} />
            <Metric label="Bills" value={summary.totalBills} />
          </>
        ) : null}
      </div>

      <div className="compare-section">
        <h3>Vote Split</h3>
        {loadingVotes ? (
          <div className="compare-card__loading">Loading votes...</div>
        ) : votes && voteTotal > 0 ? (
          <div className="compare-votes">
            <VoteBar label="Tá" value={votes.ta} total={voteTotal} className="compare-votes__ta" />
            <VoteBar label="Níl" value={votes.nil} total={voteTotal} className="compare-votes__nil" />
            <VoteBar label="Staon" value={votes.staon} total={voteTotal} className="compare-votes__staon" />
          </div>
        ) : (
          <div className="compare-card__loading">No voting data found.</div>
        )}
      </div>

      <div className="compare-section">
        <h3>Roles</h3>
        <div className="compare-tags">
          {[...member.offices, ...(member.committees ?? []).map((committee) => committee.name)].slice(0, 8).map((role) => (
            <span key={role}>{role}</span>
          ))}
          {member.offices.length === 0 && (member.committees ?? []).length === 0 && <small>No current offices or committees listed.</small>}
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="compare-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function VoteBar({ label, value, total, className }: { label: string; value: number; total: number; className: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="compare-vote-row">
      <span>{label}</span>
      <div className="compare-vote-track">
        <div className={className} style={{ width: `${pct}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}
