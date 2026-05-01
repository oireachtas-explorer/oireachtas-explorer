import { useState } from 'react';
import { Link } from 'lucide-react';
import type { Chamber, Member } from '../types';
import { partyColor } from '../utils/format';
import { viewToHash } from '../utils/routing';
import { ShareModal } from './ShareModal';

interface MemberCardProps {
  member: Member;
  chamber: Chamber;
  houseNo: number;
  constituencyCode: string;
  constituencyName: string;
  onClick: () => void;
}

export function MemberCard({ member, chamber, houseNo, constituencyCode, constituencyName, onClick }: MemberCardProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const color = partyColor(member.party);
  const label = `View profile for ${member.fullName}, ${member.party}${member.constituency ? `, ${member.constituency}` : ''}`;

  const shareUrl = window.location.origin + window.location.pathname +
    viewToHash({ kind: 'member', memberUri: member.uri, memberName: member.fullName, constituencyCode, constituencyName }, chamber, houseNo);

  return (
    <>
      {shareOpen && <ShareModal url={shareUrl} onClose={() => { setShareOpen(false); }} />}
      <div className="member-card-wrap">
        <button className="member-card" onClick={onClick} aria-label={label}>
          <div className="member-card__stripe" style={{ background: color }} />
          <div className="member-card__inner">
            <div className="member-card__photo-wrap">
              {!photoFailed ? (
                <img
                  src={member.photoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="member-card__photo"
                  onError={() => { setPhotoFailed(true); }}
                />
              ) : (
                <div className="member-card__initials" aria-hidden="true">
                  {member.firstName[0]}{member.lastName[0]}
                </div>
              )}
            </div>
            <div className="member-card__name">{member.fullName}</div>
            <span className="party-badge" style={{ backgroundColor: color }}>
              {member.party}
            </span>
            {member.offices.length > 0 && (
              <div className="member-card__office">{member.offices.find((office) => office.current)?.name ?? member.offices.at(0)?.name}</div>
            )}
          </div>
        </button>
        <button
          className="card-link-btn"
          onClick={() => { setShareOpen(true); }}
          aria-label={`Copy link to ${member.fullName}`}
        >
          <Link size={14} />
        </button>
      </div>
    </>
  );
}
