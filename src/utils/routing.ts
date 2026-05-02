import type { Chamber, View } from '../types';
import { LATEST_DAIL, LATEST_SEANAD } from './dail';

export function viewToHash(view: View, chamber: Chamber, houseNo: number): string {
  const base = `#/${chamber}/${houseNo}`;
  switch (view.kind) {
    case 'home': return base;
    case 'global-debates': return `${base}/debates`;
    case 'global-legislation': return `${base}/legislation`;
    case 'debate-viewer': return `${base}/debate/${encodeURIComponent(view.xmlUri)}/${encodeURIComponent(view.debateSectionUri)}/${encodeURIComponent(view.title)}${view.focusMemberUri ? '/' + encodeURIComponent(view.focusMemberUri) : ''}${view.speechIdx !== undefined ? '/' + String(view.speechIdx) : ''}`;
    case 'bill-viewer': return `${base}/bill/${view.billYear}/${view.billNo}`;
    case 'search': return `${base}/search${view.query ? '/' + encodeURIComponent(view.query) : ''}`;
    case 'saved': return `${base}/saved`;
    case 'collection': return `${base}/collection/${encodeURIComponent(view.slug)}`;
    case 'compare': return `${base}/compare`;
    case 'party': return `${base}/party/${encodeURIComponent(view.partyName)}`;
    case 'members': return `${base}/constituency/${encodeURIComponent(view.constituencyCode)}/${encodeURIComponent(view.constituencyName)}`;
    case 'member': return `${base}/member/${encodeURIComponent(view.memberUri)}/${encodeURIComponent(view.memberName)}/${encodeURIComponent(view.constituencyCode)}/${encodeURIComponent(view.constituencyName)}`;
    case 'committee': return `${base}/committee/${encodeURIComponent(view.committeeUri)}/${encodeURIComponent(view.committeeName)}`;
  }
}

interface ParsedHash {
  chamber: Chamber;
  houseNo: number;
  view: View;
}

export function parseHash(hash: string): ParsedHash {
  // Supported shapes (new):  #/dail/34/...   #/seanad/27/...
  // Supported shape (legacy): #/34/...       (assumed Dáil)
  const trimmed = hash.replace('#/', '');
  const parts = trimmed.split('/').filter(Boolean);

  let chamber: Chamber = 'dail';
  let rest = parts;

  if (parts[0] === 'dail' || parts[0] === 'seanad') {
    chamber = parts[0];
    rest = parts.slice(1);
  }

  const latest = chamber === 'seanad' ? LATEST_SEANAD : LATEST_DAIL;
  const maybeHouse = parseInt(rest[0] ?? '', 10);
  const hasHouseNo = !isNaN(maybeHouse) && maybeHouse >= 1 && maybeHouse <= latest;
  const houseNo = hasHouseNo ? maybeHouse : latest;
  rest = hasHouseNo ? rest.slice(1) : rest;

  if (rest[0] === 'debates') {
    return { chamber, houseNo, view: { kind: 'global-debates', houseNo } };
  }
  if (rest[0] === 'legislation') {
    return { chamber, houseNo, view: { kind: 'global-legislation' } };
  }
  if (rest[0] === 'debate' && rest[1] && rest[2]) {
    return {
      chamber, houseNo,
      view: {
        kind: 'debate-viewer',
        xmlUri: decodeURIComponent(rest[1]),
        debateSectionUri: decodeURIComponent(rest[2]),
        title: decodeURIComponent(rest[3] || 'Debate Transcript'),
        focusMemberUri: rest[4] ? decodeURIComponent(rest[4]) : undefined,
        speechIdx: rest[5] ? parseInt(rest[5], 10) : undefined,
      }
    };
  }
  if (rest[0] === 'bill' && rest[1] && rest[2]) {
    return {
      chamber, houseNo,
      view: { kind: 'bill-viewer', billYear: rest[1], billNo: rest[2] }
    };
  }
  if (rest[0] === 'search') {
    return {
      chamber, houseNo,
      view: { kind: 'search', query: rest[1] ? decodeURIComponent(rest[1]) : undefined }
    };
  }
  if (rest[0] === 'saved') {
    return { chamber, houseNo, view: { kind: 'saved' } };
  }
  if (rest[0] === 'collection' && rest[1]) {
    return { chamber, houseNo, view: { kind: 'collection', slug: decodeURIComponent(rest[1]) } };
  }
  if (rest[0] === 'compare') {
    return { chamber, houseNo, view: { kind: 'compare' } };
  }
  if (rest[0] === 'party' && rest[1]) {
    return {
      chamber, houseNo,
      view: { kind: 'party', partyName: decodeURIComponent(rest[1]) }
    };
  }
  if (rest[0] === 'constituency' && rest[1]) {
    return {
      chamber, houseNo,
      view: { kind: 'members', constituencyCode: decodeURIComponent(rest[1]), constituencyName: decodeURIComponent(rest[2] ?? rest[1]) },
    };
  }
  if (rest[0] === 'member' && rest[1]) {
    return {
      chamber, houseNo,
      view: {
        kind: 'member',
        memberUri: decodeURIComponent(rest[1]),
        memberName: decodeURIComponent(rest[2] ?? ''),
        constituencyCode: decodeURIComponent(rest[3] ?? ''),
        constituencyName: decodeURIComponent(rest[4] ?? ''),
      },
    };
  }
  if (rest[0] === 'committee' && rest[1]) {
    return {
      chamber, houseNo,
      view: {
        kind: 'committee',
        committeeUri: decodeURIComponent(rest[1]),
        committeeName: decodeURIComponent(rest[2] ?? ''),
      },
    };
  }
  return { chamber, houseNo, view: { kind: 'home' } };
}
