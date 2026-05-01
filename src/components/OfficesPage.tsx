import { useMemo } from 'react';
import type { Chamber, Member } from '../types';
import { partyColor } from '../utils/format';
import { chamberName } from '../utils/dail';

const PINNED_OFFICES: string[] = [
  'Ceann Comhairle',
  'Leas-Cheann Comhairle',
  'Taoiseach',
  'Minister for Finance',
];

function officeOrder(office: string): number {
  const idx = PINNED_OFFICES.findIndex(p => office.startsWith(p));
  return idx === -1 ? PINNED_OFFICES.length : idx;
}

interface OfficesPageProps {
  chamber: Chamber;
  houseNo: number;
  allMembers: Member[];
  loadingAllMembers: boolean;
  onSelectMember: (memberUri: string, memberName: string, constituencyCode: string, constituencyName: string) => void;
  onBack: () => void;
}

export function OfficesPage({
  chamber,
  houseNo,
  allMembers,
  loadingAllMembers,
  onSelectMember,
  onBack,
}: OfficesPageProps) {
  const officeHolders = useMemo(() => {
    return allMembers
      .filter(m => m.offices.length > 0)
      .flatMap(m => m.offices.map(office => ({ member: m, office })))
      .sort((a, b) => officeOrder(a.office.name) - officeOrder(b.office.name) || a.office.name.localeCompare(b.office.name));
  }, [allMembers]);

  return (
    <div className="container">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="member-grid-page__header">
        <h2 className="section-heading">Office Holders</h2>
        {!loadingAllMembers && (
          <p className="section-subheading">
            {houseNo}{chamber === 'dail' ? 'th' : 'th'} {chamberName(chamber)} · {officeHolders.length} appointments
          </p>
        )}
      </div>

      {loadingAllMembers && (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <span>Loading office holders…</span>
        </div>
      )}

      {!loadingAllMembers && (
        <div className="committee-member-list">
          {officeHolders.map(({ member: m, office }) => (
            <button
              key={`${m.uri}::${office.name}::${office.endDate ?? 'current'}`}
              className="committee-member-card"
              onClick={() => { onSelectMember(m.uri, m.fullName, m.constituencyCode, m.constituency); }}
            >
              <div className="committee-member-card__photo-wrap">
                <img
                  src={m.photoUrl}
                  alt={m.fullName}
                  loading="lazy"
                  className="committee-member-card__photo"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = 'none';
                    const fallback = el.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="committee-member-card__initials" style={{ display: 'none' }}>
                  {m.firstName[0]}{m.lastName[0]}
                </div>
              </div>
              <div className="committee-member-card__body">
                <div className="committee-member-card__name">{m.fullName}</div>
                <div className="committee-member-card__meta">
                  <span className="party-badge" style={{ backgroundColor: partyColor(m.party) }}>
                    {m.party}
                  </span>
                  <span className="committee-member-card__constituency">{m.constituency}</span>
                </div>
                <div className="offices-page__office-title">{office.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
