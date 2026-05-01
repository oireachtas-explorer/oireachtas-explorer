import type {
  OireachtasResult,
  ConstituencyResult,
  Constituency,
  MemberResult,
  MembershipRaw,
  CommitteeMembership,
  Member,
  DebateResult,
  Debate,
  DivisionResult,
  Division,
  QuestionResult,
  Question,
  BillResult,
  Bill,
  ActivitySummary,
  VoteBreakdown,
  Chamber,
} from '../types';
import { getHouseDateRange, LATEST_DAIL, LATEST_SEANAD } from '../utils/dail';
import { VOTE_HISTORY_CHUNK_LIMIT } from '../constants';

export type ChamberType = 'house' | 'committee' | '';

const BASE = 'https://api.oireachtas.ie/v1';

function defaultHouseNo(chamber: Chamber): number {
  return chamber === 'seanad' ? LATEST_SEANAD : LATEST_DAIL;
}

function houseUri(chamber: Chamber, houseNo: number): string {
  return `https://data.oireachtas.ie/ie/oireachtas/house/${chamber}/${houseNo}`;
}

// Session-scoped response cache. Dedups in-flight requests and caches successful
// responses for the lifetime of the page — parliamentary data is append-mostly
// and doesn't need revalidation within a session.
const responseCache = new Map<string, Promise<unknown>>();

function apiFetch<T>(path: string, params: Record<string, string | number> = {}, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const key = url.toString();

  const cached = responseCache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = fetch(key, { signal })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${response.statusText}`);
      }
      return response.json() as T;
    })
    .catch((err: unknown) => {
      // Evict failed requests so retries can succeed.
      responseCache.delete(key);
      throw err;
    });

  responseCache.set(key, promise);
  return promise;
}

export function clearApiCache(): void {
  responseCache.clear();
}

export function getMemberPhotoUrl(memberUri: string): string {
  return `${memberUri}/image/thumb`;
}

// ── Constituencies ────────────────────────────────────────────────────────────

const gaCollator = new Intl.Collator('ga');

export async function fetchConstituencies(
  chamber: Chamber = 'dail',
  houseNo?: number,
  signal?: AbortSignal
): Promise<Constituency[]> {
  const data = await apiFetch<OireachtasResult<ConstituencyResult>>(
    '/constituencies',
    { chamber, house_no: houseNo ?? defaultHouseNo(chamber), limit: 200 },
    signal
  );
  // For Dáil this yields constituencies; for Seanad it yields panels + university
  // seats + Taoiseach's nominees — all grouped under the same `representType`
  // taxonomy ('constituency' | 'panel' | …). We include everything returned and
  // let the UI present them as a flat list.
  return data.results
    .map((r) => ({
      uri: r.constituencyOrPanel.uri,
      name: r.constituencyOrPanel.showAs,
      code: r.constituencyOrPanel.representCode,
    }))
    .sort((a, b) => gaCollator.compare(a.name, b.name));
}

// ── Members ────────────────────────────────────────────────────────────────────

function extractParty(memberships: MembershipRaw[]): string {
  // Prefer the active party with the most recent start date. Fall back to the
  // party with the latest end date if none are active. Returning on the first
  // active match (as a prior version did) can surface a stale affiliation when
  // an older membership precedes the current one in the response.
  let activeParty = '';
  let activeStart = '';
  let endedParty = '';
  let endedDate = '';

  for (const m of memberships) {
    for (const p of m.membership.parties) {
      const start = p.party.dateRange?.start ?? '';
      const end = p.party.dateRange?.end;
      if (!end) {
        if (start >= activeStart) {
          activeStart = start;
          activeParty = p.party.showAs;
        }
      } else if (end > endedDate) {
        endedDate = end;
        endedParty = p.party.showAs;
      }
    }
  }
  return activeParty || endedParty || 'Independent';
}

function extractConstituency(memberships: MembershipRaw[]): { name: string; code: string } {
  // Prefer explicit constituency/panel, otherwise fall back to the first
  // represent on record — Seanad senators are represented by panels or
  // university seats, which use different `representType` values.
  for (const m of memberships) {
    for (const rep of m.membership.represents) {
      if (rep.represent.representType === 'constituency' || rep.represent.representType === 'panel') {
        return { name: rep.represent.showAs, code: rep.represent.representCode };
      }
    }
  }
  for (const m of memberships) {
    const rep = m.membership.represents.at(0);
    if (rep) return { name: rep.represent.showAs, code: rep.represent.representCode };
  }
  return { name: '', code: '' };
}

function extractCommittees(memberships: MembershipRaw[], chamber: Chamber, houseNo: number): CommitteeMembership[] {
  for (const ms of memberships) {
    const h = ms.membership.house;
    if (h.houseCode !== chamber || h.houseNo !== String(houseNo)) continue;
    const raw = ms.membership.committees ?? [];
    return raw
      .filter(c => c.memberDateRange.end === null)
      .map(c => ({
        name: c.committeeName[0]?.nameEn ?? '',
        uri: c.uri,
        role: Array.isArray(c.role) ? 'Member' : c.role.title,
      }))
      .filter(c => c.name !== '');
  }
  return [];
}

function extractOffices(memberships: MembershipRaw[]): string[] {
  const offices: string[] = [];
  for (const m of memberships) {
    for (const o of m.membership.offices) {
      if (o.office.dateRange.end === null) {
        offices.push(o.office.officeName.showAs);
      }
    }
  }
  return offices;
}

function toMember(r: MemberResult, chamber?: Chamber, houseNo?: number): Member {
  const m = r.member;
  const c = extractConstituency(m.memberships);
  return {
    uri: m.uri,
    memberCode: m.memberCode,
    fullName: m.fullName,
    firstName: m.firstName,
    lastName: m.lastName,
    party: extractParty(m.memberships),
    constituency: c.name,
    constituencyCode: c.code,
    photoUrl: getMemberPhotoUrl(m.uri),
    offices: extractOffices(m.memberships),
    committees: chamber !== undefined && houseNo !== undefined
      ? extractCommittees(m.memberships, chamber, houseNo)
      : undefined,
  };
}

export async function fetchMembersByConstituency(
  constituencyCode: string,
  chamber: Chamber = 'dail',
  houseNo?: number,
  signal?: AbortSignal
): Promise<Member[]> {
  const data = await apiFetch<OireachtasResult<MemberResult>>(
    '/members',
    { const_code: constituencyCode, chamber, house_no: houseNo ?? defaultHouseNo(chamber), limit: 50 },
    signal
  );
  return data.results.map(r => toMember(r));
}

export async function fetchAllMembers(
  chamber: Chamber = 'dail',
  houseNo?: number,
  signal?: AbortSignal
): Promise<Member[]> {
  const resolvedHouseNo = houseNo ?? defaultHouseNo(chamber);
  const data = await apiFetch<OireachtasResult<MemberResult>>(
    '/members',
    { chamber, house_no: resolvedHouseNo, limit: 500 },
    signal
  );
  return data.results.map(r => toMember(r, chamber, resolvedHouseNo));
}

export async function fetchMember(memberUri: string, chamber: Chamber, houseNo: number, signal?: AbortSignal): Promise<Member | null> {
  const data = await apiFetch<OireachtasResult<MemberResult>>(
    '/members',
    { member_id: memberUri, limit: 1 },
    signal
  );
  if (data.results.length === 0) return null;
  return toMember(data.results[0], chamber, houseNo);
}

// ── Debates ────────────────────────────────────────────────────────────────────

function chamberFromUri(uri: string): string {
  if (uri.includes('/dail/')) return 'Dáil Éireann';
  if (uri.includes('/seanad/')) return 'Seanad Éireann';
  return 'Committee';
}

function applyDateParams(params: Record<string, string | number>, dateStart?: string, dateEnd?: string): void {
  if (dateStart) params.date_start = dateStart;
  if (dateEnd) params.date_end = dateEnd;
}

export async function fetchDebates(memberUri: string, limit = 20, skip = 0, chamber: Chamber, houseNo: number, signal?: AbortSignal, dateStart?: string, dateEnd?: string): Promise<{ debates: Debate[]; total: number }> {
  const params: Record<string, string | number> = { member_id: memberUri, limit, skip, chamber_id: houseUri(chamber, houseNo) };
  applyDateParams(params, dateStart, dateEnd);
  const data = await apiFetch<OireachtasResult<DebateResult>>(
    '/debates',
    params,
    signal
  );
  const debates = data.results.map((r) => {
    const d = r.debateRecord;
    const sections = d.debateSections.map(s => ({
      uri: s.debateSection.uri,
      title: s.debateSection.showAs
    }));
    const firstSection = d.debateSections.at(0)?.debateSection;
    return {
      uri: firstSection?.uri ?? d.uri,
      date: d.date,
      title: firstSection?.showAs ?? d.debateType,
      chamber: chamberFromUri(d.uri),
      xmlUri: d.formats?.xml?.uri,
      sections,
      debateSectionUri: firstSection?.uri,
    };
  });
  return { debates, total: data.head.counts.resultCount ?? debates.length };
}


export async function fetchGlobalDebates(
  limit = 20,
  skip = 0,
  chamber: Chamber,
  houseNo: number,
  chamberType: ChamberType = 'house',
  dateStart?: string,
  dateEnd?: string,
  signal?: AbortSignal
): Promise<{ debates: Debate[]; total: number }> {

  const params: Record<string, string | number> = { limit, skip };

  if (chamberType) {
    params.chamber_type = chamberType;
  }

  // Only house debates can be scoped to a specific chamber_id reliably.
  // Committee URIs are not stable across sessions, so committees are filtered
  // client-side after fetching by chamber_type + date range.
  if (chamberType === 'house' && houseNo) {
    params.chamber_id = houseUri(chamber, houseNo);
  }

  if (!dateStart && chamberType === 'committee' && houseNo) {
    const range = getHouseDateRange(chamber, houseNo);
    params.date_start = range.start;
    params.date_end = range.end;
  } else {
    if (dateStart) params.date_start = dateStart;
    if (dateEnd) params.date_end = dateEnd;
  }

  const data = await apiFetch<OireachtasResult<DebateResult>>(
    '/debates',
    params,
    signal
  );
  const debates = data.results.map((r) => {
    const d = r.debateRecord;
    const sections = d.debateSections.map(s => ({
      uri: s.debateSection.uri,
      title: s.debateSection.showAs
    }));
    const firstSection = d.debateSections.at(0)?.debateSection;
    return {
      uri: firstSection?.uri ?? d.uri,
      date: d.date,
      title: firstSection?.showAs ?? d.debateType,
      chamber: chamberFromUri(d.uri),
      xmlUri: d.formats?.xml?.uri,
      sections,
      debateSectionUri: firstSection?.uri,
    };
  });
  return { debates, total: data.head.counts.resultCount ?? debates.length };
}

// ── Divisions ─────────────────────────────────────────────────────────────────

function parseTallyType(showAs: string): 'ta' | 'nil' | 'staon' {
  const s = showAs.toLowerCase();
  if (s === 'tá' || s === 'ta') return 'ta';
  if (s === 'níl' || s === 'nil') return 'nil';
  return 'staon';
}

export async function fetchDivisions(memberUri: string, limit = 50, skip = 0, chamber: Chamber, houseNo: number, signal?: AbortSignal, dateStart?: string, dateEnd?: string): Promise<{ divisions: Division[]; total: number }> {
  const params: Record<string, string | number> = { member_id: memberUri, limit, skip, chamber_id: houseUri(chamber, houseNo) };
  applyDateParams(params, dateStart, dateEnd);
  const data = await apiFetch<OireachtasResult<DivisionResult>>(
    '/divisions',
    params,
    signal
  );
  const divisions = data.results.map((r) => {
    const d = r.division;
    const tallyShowAs = d.memberTally?.showAs ?? '';
    const voteType = parseTallyType(tallyShowAs);
    const title = d.debate?.showAs ?? d.subject?.showAs ?? d.voteId;
    return {
      uri: d.uri,
      date: d.date,
      title,
      voteType,
      voteLabel: tallyShowAs || (voteType === 'ta' ? 'Tá' : voteType === 'nil' ? 'Níl' : 'Staon'),
      outcome: d.outcome ?? '',
      tallyFor: d.tallies?.taVotes?.tally ?? 0,
      tallyAgainst: d.tallies?.nilVotes?.tally ?? 0,
      xmlUri: d.debate?.formats?.xml?.uri,
      debateSectionUri: d.debate?.debateSection,
    };
  });
  return { divisions, total: data.head.counts.resultCount ?? divisions.length };
}

// ── Questions ─────────────────────────────────────────────────────────────────

export async function fetchQuestions(memberUri: string, limit = 20, skip = 0, chamber: Chamber, houseNo: number, signal?: AbortSignal, dateStart?: string, dateEnd?: string): Promise<{ questions: Question[]; total: number }> {
  const { start, end } = getHouseDateRange(chamber, houseNo);
  const params: Record<string, string | number> = {
    member_id: memberUri,
    qtype: 'oral,written',
    limit,
    skip,
    date_start: dateStart ?? start,
    date_end: dateEnd ?? end,
  };
  const data = await apiFetch<OireachtasResult<QuestionResult>>(
    '/questions',
    params,
    signal
  );
  const questions = data.results.map((r) => {
    const q = r.question;
    const role: 'asked' | 'answered' = (q.by?.uri ?? '').endsWith(memberUri) ? 'asked' : 'answered';
    return {
      uri: q.uri,
      date: q.date,
      questionType: q.questionType,
      questionNumber: q.questionNumber,
      questionText: q.showAs ?? '',
      askedBy: q.by?.showAs ?? '',
      department: q.to?.showAs ?? '',
      role,
      xmlUri: q.debateSection?.formats?.xml?.uri,
      debateSectionUri: q.debateSection?.uri,
    };
  });
  return { questions, total: data.head.counts.resultCount ?? questions.length };
}

export async function fetchGlobalQuestions(
  limit = 50,
  skip = 0,
  chamber: Chamber,
  houseNo: number,
  signal?: AbortSignal
): Promise<{ questions: Question[]; total: number }> {
  const { start, end } = getHouseDateRange(chamber, houseNo);
  const data = await apiFetch<OireachtasResult<QuestionResult>>(
    '/questions',
    { chamber, qtype: 'oral,written', limit, skip, date_start: start, date_end: end },
    signal
  );
  const questions = data.results.map((r) => {
    const q = r.question;
    return {
      uri: q.uri,
      date: q.date,
      questionType: q.questionType,
      questionNumber: q.questionNumber,
      questionText: q.showAs ?? '',
      askedBy: q.by?.showAs ?? '',
      department: q.to?.showAs ?? '',
      role: 'asked' as const,
      xmlUri: q.debateSection?.formats?.xml?.uri,
      debateSectionUri: q.debateSection?.uri,
    };
  });
  return { questions, total: data.head.counts.resultCount ?? questions.length };
}

// ── Legislation ───────────────────────────────────────────────────────────────

function toBill(r: BillResult): Bill {
  const b = r.bill;
  return {
    uri: b.uri,
    billNo: b.billNo,
    billYear: b.billYear,
    title: b.shortTitleEn.trim(),
    longTitleEn: b.longTitleEn,
    status: b.status,
    source: b.source,
    originHouse: b.originHouse?.showAs ?? '',
    sponsors: b.sponsors
      .map((s) => s.sponsor.by.showAs)
      .filter(Boolean),
    currentStage: b.mostRecentStage?.event?.showAs ?? '—',
    lastUpdated: b.lastUpdated,
    stages: b.stages,
    versions: b.versions?.map(v => ({
      title: v.version.showAs,
      date: v.version.date,
      pdfUri: v.version.formats?.pdf?.uri,
      xmlUri: v.version.formats?.xml?.uri
    })),
    relatedDocs: b.relatedDocs?.map(d => ({
      title: d.relatedDoc.showAs,
      date: d.relatedDoc.date,
      pdfUri: d.relatedDoc.formats?.pdf?.uri,
      xmlUri: d.relatedDoc.formats?.xml?.uri
    })),
  };
}

export async function fetchLegislation(memberUri: string, limit = 20, skip = 0, chamber: Chamber, houseNo: number, signal?: AbortSignal, dateStart?: string, dateEnd?: string): Promise<{ bills: Bill[]; total: number }> {
  const params: Record<string, string | number> = { member_id: memberUri, limit, skip, chamber_id: houseUri(chamber, houseNo) };
  applyDateParams(params, dateStart, dateEnd);
  const data = await apiFetch<OireachtasResult<BillResult>>(
    '/legislation',
    params,
    signal
  );
  const bills = data.results.map(toBill);
  return { bills, total: data.head.counts.resultCount ?? bills.length };
}

export async function fetchGlobalLegislation(
  limit = 100,
  skip = 0,
  chamber: Chamber,
  houseNo: number,
  signal?: AbortSignal
): Promise<{ bills: Bill[]; total: number }> {
  const { start, end } = getHouseDateRange(chamber, houseNo);
  const data = await apiFetch<OireachtasResult<BillResult>>(
    '/legislation',
    { limit, skip, chamber_id: houseUri(chamber, houseNo), date_start: start, date_end: end },
    signal
  );
  const bills = data.results.map(toBill);
  return { bills, total: data.head.counts.resultCount ?? bills.length };
}

export async function fetchBill(billNo: string, billYear: string, signal?: AbortSignal): Promise<Bill | null> {
  const data = await apiFetch<OireachtasResult<BillResult>>(
    '/legislation',
    { bill_no: billNo, bill_year: billYear, limit: 1 },
    signal
  );
  if (data.results.length === 0) return null;
  return toBill(data.results[0]);
}

// ── Activity Summary (for enriched Overview) ──────────────────────────────────

// Activity summary leverages the list apis with standard page limits (20)
// so the initial fetch prepopulates the cache for the first page of the list tabs.
export async function fetchActivitySummary(memberUri: string, chamber: Chamber, houseNo: number, signal?: AbortSignal, dateStart?: string, dateEnd?: string): Promise<ActivitySummary> {
  const [debatesRes, votesRes, questionsRes, billsRes] = await Promise.all([
    fetchDebates(memberUri, 20, 0, chamber, houseNo, signal, dateStart, dateEnd),
    fetchDivisions(memberUri, 20, 0, chamber, houseNo, signal, dateStart, dateEnd),
    fetchQuestions(memberUri, 20, 0, chamber, houseNo, signal, dateStart, dateEnd),
    fetchLegislation(memberUri, 20, 0, chamber, houseNo, signal, dateStart, dateEnd),
  ]);

  return {
    totalDebates: debatesRes.total,
    totalVotes: votesRes.total,
    totalQuestions: questionsRes.total,
    totalBills: billsRes.total,
  };
}

// Separate, deferrable fetch for the voting-split donut. Kept out of the main
// summary so the stat cards can render immediately on member load.
export async function fetchVoteBreakdown(memberUri: string, chamber: Chamber, houseNo: number, signal?: AbortSignal, dateStart?: string, dateEnd?: string): Promise<VoteBreakdown> {
  let allDivisions: Division[] = [];
  let skip = 0;
  const chunkLimit = VOTE_HISTORY_CHUNK_LIMIT;

  let running = true;
  while (running) {
    if (signal?.aborted) throw new Error('Aborted');
    const { divisions, total } = await fetchDivisions(memberUri, chunkLimit, skip, chamber, houseNo, signal, dateStart, dateEnd);
    allDivisions = allDivisions.concat(divisions);

    // Stop if we hit the limit of available results
    if (divisions.length < chunkLimit || allDivisions.length >= total) {
      running = false;
    } else {
      skip += chunkLimit;
    }
  }

  const breakdown: VoteBreakdown = { ta: 0, nil: 0, staon: 0, sampleSize: allDivisions.length };
  for (const d of allDivisions) {
    breakdown[d.voteType]++;
  }
  return breakdown;
}
