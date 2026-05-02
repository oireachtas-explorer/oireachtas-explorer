import type { BillSponsor, Chamber, Member } from '../types';
import { viewToHash } from './routing';

function normalizeOfficeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function sponsorProfileHash(
  sponsor: BillSponsor,
  allMembers: Member[] | undefined,
  chamber: Chamber,
  houseNo: number
): string | null {
  const members = allMembers ?? [];
  const exactMember = sponsor.uri
    ? members.find((member) => member.uri === sponsor.uri)
    : undefined;

  if (exactMember) {
    return viewToHash({
      kind: 'member',
      memberUri: exactMember.uri,
      memberName: exactMember.fullName,
      constituencyCode: exactMember.constituencyCode,
      constituencyName: exactMember.constituency,
    }, chamber, houseNo);
  }

  if (sponsor.kind === 'member' && sponsor.uri) {
    return viewToHash({
      kind: 'member',
      memberUri: sponsor.uri,
      memberName: sponsor.name,
      constituencyCode: '',
      constituencyName: '',
    }, chamber, houseNo);
  }

  if (sponsor.kind !== 'office') return null;

  const sponsorOffice = normalizeOfficeName(sponsor.name);
  const officeHolder = members.find((member) =>
    member.offices.some((office) => office.current && normalizeOfficeName(office.name) === sponsorOffice)
  ) ?? members.find((member) =>
    member.offices.some((office) => normalizeOfficeName(office.name) === sponsorOffice)
  );

  if (!officeHolder) return null;

  return viewToHash({
    kind: 'member',
    memberUri: officeHolder.uri,
    memberName: officeHolder.fullName,
    constituencyCode: officeHolder.constituencyCode,
    constituencyName: officeHolder.constituency,
  }, chamber, houseNo);
}
