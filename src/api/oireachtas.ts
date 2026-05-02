import type {
  OireachtasResult,
  ConstituencyResult,
  Constituency,
  MemberResult,
  MembershipRaw,
  CommitteeMembership,
  Member,
  OfficeHolding,
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

export interface CommitteeDebateIndexItem {
  code: string;
  name: string;
  count: number;
}

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

function abortError(): Error {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function withAbortSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => { reject(abortError()); };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(toError(error));
      }
    );
  });
}

function apiFetch<T>(path: string, params: Record<string, string | number> = {}, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const key = url.toString();

  const cached = responseCache.get(key);
  if (cached) return withAbortSignal(cached as Promise<T>, signal);

  const promise = fetch(key)
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
  return withAbortSignal(promise, signal);
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

function extractParty(memberships: MembershipRaw[], chamber: Chamber, houseNo: number): string {
  const houseRange = getHouseDateRange(chamber, houseNo);
  let selectedParty = '';
  let selectedStart = '';
  let selectedEnd = '';

  for (const m of memberships) {
    const h = m.membership.house;
    if (h.houseCode !== chamber || h.houseNo !== String(houseNo)) continue;

    for (const p of m.membership.parties) {
      const start = p.party.dateRange?.start ?? '';
      const end = p.party.dateRange?.end ?? houseRange.end;
      if (start <= houseRange.end && end >= houseRange.start) {
        if (!selectedParty || start > selectedStart || (start === selectedStart && end > selectedEnd)) {
          selectedParty = p.party.showAs;
          selectedStart = start;
          selectedEnd = end;
        }
      }
    }
  }

  if (selectedParty) return selectedParty;

  const fallback = memberships
    .find((m) => m.membership.house.houseCode === chamber && m.membership.house.houseNo === String(houseNo))
    ?.membership.parties.at(-1)?.party.showAs;
  return fallback ?? 'Independent';
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

function extractOffices(memberships: MembershipRaw[], chamber: Chamber, houseNo: number): OfficeHolding[] {
  const houseRange = getHouseDateRange(chamber, houseNo);
  const offices = new Map<string, OfficeHolding>();

  for (const m of memberships) {
    const h = m.membership.house;
    if (h.houseCode !== chamber || h.houseNo !== String(houseNo)) continue;

    for (const o of m.membership.offices) {
      const start = o.office.dateRange.start;
      const endDate = o.office.dateRange.end;
      const end = endDate ?? houseRange.end;
      if (start <= houseRange.end && end >= houseRange.start) {
        const name = o.office.officeName.showAs;
        const existing = offices.get(name);
        const next: OfficeHolding = {
          name,
          startDate: start,
          endDate,
          current: endDate === null,
        };

        if (!existing) {
          offices.set(name, next);
          continue;
        }

        if (next.current && !existing.current) {
          offices.set(name, next);
          continue;
        }

        if (next.current === existing.current && next.startDate > existing.startDate) {
          offices.set(name, next);
        }
      }
    }
  }

  return Array.from(offices.values());
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
    chamber: chamber ?? 'dail',
    houseNo: houseNo ?? defaultHouseNo(chamber ?? 'dail'),
    party: chamber !== undefined && houseNo !== undefined
      ? extractParty(m.memberships, chamber, houseNo)
      : 'Independent',
    constituency: c.name,
    constituencyCode: c.code,
    photoUrl: getMemberPhotoUrl(m.uri),
    offices: chamber !== undefined && houseNo !== undefined
      ? extractOffices(m.memberships, chamber, houseNo)
      : [],
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
  const resolvedHouseNo = houseNo ?? defaultHouseNo(chamber);
  const data = await apiFetch<OireachtasResult<MemberResult>>(
    '/members',
    { const_code: constituencyCode, chamber, house_no: resolvedHouseNo, limit: 50 },
    signal
  );
  return data.results.map(r => toMember(r, chamber, resolvedHouseNo));
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

function committeeCodeFromDebateResult(result: DebateResult): string | undefined {
  const fromHouse = result.debateRecord.house?.committeeCode;
  if (fromHouse) return fromHouse;

  const match = /\/debateRecord\/([a-z][a-z0-9_]+)\//i.exec(result.debateRecord.uri);
  const code = match?.[1]?.toLowerCase();
  return code && code !== 'dail' && code !== 'seanad' ? code : undefined;
}

function toDebate(result: DebateResult): Debate {
  const d = result.debateRecord;
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
}

export async function fetchDebates(memberUri: string, limit = 20, skip = 0, chamber: Chamber, houseNo: number, signal?: AbortSignal, dateStart?: string, dateEnd?: string): Promise<{ debates: Debate[]; total: number }> {
  const params: Record<string, string | number> = { member_id: memberUri, limit, skip, chamber_id: houseUri(chamber, houseNo) };
  applyDateParams(params, dateStart, dateEnd);
  const data = await apiFetch<OireachtasResult<DebateResult>>(
    '/debates',
    params,
    signal
  );
  const debates = data.results.map(toDebate);
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
  const debates = data.results.map(toDebate);
  return { debates, total: data.head.counts.resultCount ?? debates.length };
}

export async function fetchCommitteeDebateSearch(
  chamber: Chamber,
  houseNo: number,
  committeeCode: string,
  dateStart?: string,
  dateEnd?: string,
  signal?: AbortSignal
): Promise<{ debates: Debate[]; total: number }> {
  const range = getHouseDateRange(chamber, houseNo);
  const pageSize = 100;
  const baseParams: Record<string, string | number> = {
    chamber_type: 'committee',
    date_start: dateStart ?? range.start,
    date_end: dateEnd ?? range.end,
    limit: pageSize,
  };

  const firstPage = await apiFetch<OireachtasResult<DebateResult>>(
    '/debates',
    { ...baseParams, skip: 0 },
    signal
  );
  const total = firstPage.head.counts.resultCount ?? firstPage.results.length;
  const pages = [firstPage];

  if (total > pageSize) {
    const requests: Promise<OireachtasResult<DebateResult>>[] = [];
    for (let skip = pageSize; skip < total; skip += pageSize) {
      requests.push(apiFetch<OireachtasResult<DebateResult>>(
        '/debates',
        { ...baseParams, skip },
        signal
      ));
    }
    pages.push(...await Promise.all(requests));
  }

  const debates = pages
    .flatMap((page) => page.results)
    .filter((result) => committeeCodeFromDebateResult(result) === committeeCode)
    .map(toDebate);

  return { debates, total: debates.length };
}

export async function fetchCommitteeDebateIndex(
  chamber: Chamber,
  houseNo: number,
  signal?: AbortSignal
): Promise<CommitteeDebateIndexItem[]> {
  const range = getHouseDateRange(chamber, houseNo);
  const pageSize = 100;
  const baseParams: Record<string, string | number> = {
    chamber_type: 'committee',
    date_start: range.start,
    date_end: range.end,
    limit: pageSize,
  };

  const firstPage = await apiFetch<OireachtasResult<DebateResult>>(
    '/debates',
    { ...baseParams, skip: 0 },
    signal
  );
  const total = firstPage.head.counts.resultCount ?? firstPage.results.length;
  const pages = [firstPage];

  if (total > pageSize) {
    const requests: Promise<OireachtasResult<DebateResult>>[] = [];
    for (let skip = pageSize; skip < total; skip += pageSize) {
      requests.push(apiFetch<OireachtasResult<DebateResult>>(
        '/debates',
        { ...baseParams, skip },
        signal
      ));
    }
    pages.push(...await Promise.all(requests));
  }

  const committees = new Map<string, CommitteeDebateIndexItem>();
  for (const page of pages) {
    for (const result of page.results) {
      const house = result.debateRecord.house;
      const code = house?.committeeCode;
      if (!code) continue;

      const existing = committees.get(code);
      if (existing) {
        existing.count += 1;
      } else {
        committees.set(code, {
          code,
          name: house.showAs,
          count: 1,
        });
      }
    }
  }

  return Array.from(committees.values())
    .sort((a, b) => a.name.localeCompare(b.name));
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

export async function fetchAllQuestionsForMember(
  memberUri: string,
  chamber: Chamber,
  houseNo: number,
  signal?: AbortSignal,
  dateStart?: string,
  dateEnd?: string
): Promise<{ questions: Question[]; total: number }> {
  const pageSize = 500;
  const firstPage = await fetchQuestions(memberUri, pageSize, 0, chamber, houseNo, signal, dateStart, dateEnd);
  const questions = [...firstPage.questions];
  const total = firstPage.total;

  for (let skip = questions.length; skip < total; skip += pageSize) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const page = await fetchQuestions(memberUri, pageSize, skip, chamber, houseNo, signal, dateStart, dateEnd);
    questions.push(...page.questions);
  }

  return { questions, total };
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
      .map((s) => {
        const memberName = s.sponsor.by?.showAs ?? '';
        const officeName = s.sponsor.as?.showAs ?? '';
        const name = memberName || officeName;
        if (!name) return null;
        return {
          name,
          uri: s.sponsor.by?.uri ?? s.sponsor.as?.uri ?? undefined,
          isPrimary: s.sponsor.isPrimary,
          kind: memberName ? 'member' as const : 'office' as const,
        };
      })
      .filter((sponsor): sponsor is NonNullable<typeof sponsor> => sponsor !== null),
    currentStage: b.mostRecentStage?.event?.showAs ?? '—',
    hasAct: b.act !== null,
    currentStageProgress: b.mostRecentStage?.event?.progressStage,
    currentStageCompleted: b.mostRecentStage?.event?.stageCompleted,
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
  signal?: AbortSignal,
  dateStart?: string,
  dateEnd?: string,
  scopeToHouse = true
): Promise<{ bills: Bill[]; total: number }> {
  const { start, end } = getHouseDateRange(chamber, houseNo);
  const params: Record<string, string | number> = {
    limit,
    skip,
    chamber,
    date_start: dateStart ?? start,
    date_end: dateEnd ?? end
  };
  if (scopeToHouse) params.chamber_id = houseUri(chamber, houseNo);
  const data = await apiFetch<OireachtasResult<BillResult>>(
    '/legislation',
    params,
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
