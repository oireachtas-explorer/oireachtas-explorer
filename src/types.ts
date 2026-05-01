// ── Chamber ──────────────────────────────────────────────────────────────────

export type Chamber = 'dail' | 'seanad';

// ── View state ──────────────────────────────────────────────────────────────

export type View =
  | { kind: 'home' }
  | { kind: 'global-debates'; houseNo: number }
  | { kind: 'debate-viewer'; xmlUri: string; debateSectionUri: string; title: string; focusMemberUri?: string; speechIdx?: number }
  | { kind: 'bill-viewer'; billNo: string; billYear: string }
  | { kind: 'search'; query?: string }
  | { kind: 'saved' }
  | { kind: 'collection'; slug: string }
  | { kind: 'compare' }
  | { kind: 'party'; partyName: string }
  | { kind: 'members'; constituencyCode: string; constituencyName: string }
  | { kind: 'member'; memberUri: string; memberName: string; constituencyCode: string; constituencyName: string }
  | { kind: 'committee'; committeeUri: string; committeeName: string }
  ;

// ── API response wrapper ─────────────────────────────────────────────────────

export interface OireachtasResult<T> {
  results: T[];
  head: {
    counts: { resultCount?: number; billCount?: number };
    time?: string;
  };
}

// ── Constituency ─────────────────────────────────────────────────────────────

export interface ConstituencyResult {
  constituencyOrPanel: {
    representCode: string;
    representType: string;
    showAs: string;
    uri: string;
  };
  house: {
    uri: string;
    houseCode: string;
    showAs: string;
    houseNo: string;
  };
}

export interface Constituency {
  uri: string;
  name: string;
  code: string;
}

// ── Member ────────────────────────────────────────────────────────────────────

export interface PartyRaw {
  party: {
    uri: string;
    showAs: string;
    partyCode: string;
    dateRange?: { start: string; end: string | null };
  };
}

export interface RepresentRaw {
  represent: {
    uri: string;
    showAs: string;
    representCode: string;
    representType: string;
  };
}

export interface CommitteeRaw {
  committeeCode: string;
  uri: string;
  committeeName: {
    nameEn: string;
    nameGa: string;
    dateRange: { start: string; end: string | null };
  }[];
  role: [] | { title: string; dateRange: { start: string; end: string | null } };
  status: string;
  memberDateRange: { start: string; end: string | null };
}

export interface CommitteeMembership {
  name: string;
  uri: string;
  role: string;
}

export interface MembershipRaw {
  membership: {
    uri: string;
    house: {
      uri: string;
      showAs: string;
      houseCode: string;
      houseNo: string;
      chamberType: string;
    };
    represents: RepresentRaw[];
    parties: PartyRaw[];
    offices: {
      office: {
        dateRange: { start: string; end: string | null };
        officeName: { uri: string | null; showAs: string };
      };
    }[];
    committees?: CommitteeRaw[];
    dateRange?: { start: string; end: string | null };
  };
}

export interface MemberResult {
  member: {
    uri: string;
    memberCode: string;
    fullName: string;
    lastName: string;
    firstName: string;
    showAs: string;
    gender: string;
    dateOfDeath: string | null;
    image: boolean | string;
    memberships: MembershipRaw[];
  };
}

export interface Member {
  uri: string;
  memberCode: string;
  fullName: string;
  firstName: string;
  lastName: string;
  chamber: Chamber;
  houseNo: number;
  party: string;
  constituency: string;
  constituencyCode: string;
  photoUrl: string;
  offices: OfficeHolding[];
  committees?: CommitteeMembership[];
}

export interface OfficeHolding {
  name: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
}

// ── Debate ────────────────────────────────────────────────────────────────────

export interface DebateSectionRaw {
  debateSection: {
    debateSectionId: string;
    showAs: string;
    uri: string;
    debateType?: string;
    bill?: { uri: string | null; showAs: string } | null;
  };
}

export interface DebateResult {
  debateRecord: {
    uri: string;
    date: string;
    debateType: string;
    house?: {
      chamberType: string;
      committeeCode?: string;
      showAs: string;
      uri: string;
      houseCode: string;
      houseNo: string;
    };
    debateSections: DebateSectionRaw[];
    formats?: { xml?: { uri: string }; pdf?: { uri: string } };
  };
}

export interface DebateSection {
  uri: string;
  title: string;
}

export interface Debate {
  uri: string;
  date: string;
  title: string;
  chamber: string;
  xmlUri?: string;
  sections: DebateSection[];
  debateSectionUri?: string; // Legacy fallback
}

export interface SpeechSegment {
  speakerId: string;
  speakerName: string;
  memberUri: string | null;
  paragraphs: string[];
}

// ── Division (vote) ───────────────────────────────────────────────────────────

export interface DivisionResult {
  contextDate: string;
  division: {
    uri: string;
    date: string;
    datetime: string;
    outcome: string | null;
    chamber: { uri: string; showAs: string };
    house: { uri: string; houseNo: string; houseCode: string; showAs: string };
    debate?: {
      uri: string;
      showAs: string;
      debateSection: string;
      formats?: { xml?: { uri: string }; pdf?: { uri: string } };
    };
    subject?: {
      uri: string | null;
      showAs: string;
    };
    memberTally?: {
      member: { memberCode: string; showAs: string; uri: string };
      showAs: string;
    };
    tallies?: {
      taVotes?: { tally: number; showAs: string };
      nilVotes?: { tally: number; showAs: string };
      staonVotes?: { tally: number; showAs: string };
    };
    voteId: string;
    isBill: boolean;
    category: string;
  };
}

export interface Division {
  uri: string;
  date: string;
  title: string;
  voteType: 'ta' | 'nil' | 'staon';
  voteLabel: string;
  outcome: string;
  tallyFor: number;
  tallyAgainst: number;
  xmlUri?: string;
  debateSectionUri?: string;
}

// ── Parliamentary Question ────────────────────────────────────────────────────

export interface QuestionResult {
  contextDate: string;
  question: {
    uri: string;
    questionType: string;
    questionNumber: number;
    date: string;
    showAs?: string;
    by?: {
      memberCode: string;
      uri: string;
      showAs: string;
    };
    to?: {
      showAs: string;
      roleCode: string | null;
      roleType: string | null;
      uri: string | null;
    };
    house: {
      houseNo: string;
      houseCode: string;
      showAs: string;
    };
    debateSection?: {
      debateSectionId: string;
      uri: string;
      formats?: { xml?: { uri: string } };
    };
  };
}

export interface Question {
  uri: string;
  date: string;
  questionType: string;
  questionNumber: number;
  questionText: string;
  askedBy: string;
  department: string;
  role: 'asked' | 'answered';
  xmlUri?: string;
  debateSectionUri?: string;
}

// ── Legislation (Bills) ──────────────────────────────────────────────────────

export interface BillSponsorRaw {
  sponsor: {
    as: { showAs: string | null; uri: string | null };
    by: { showAs: string; uri: string };
    isPrimary: boolean;
  };
}

export interface BillStageRaw {
  event?: {
    chamber: { chamberCode: string; showAs: string; uri: string };
    dates: { date: string }[];
    house: {
      chamberCode: string;
      chamberType: string;
      houseCode: string;
      houseNo: string;
      showAs: string;
      uri: string;
    };
    progressStage: number;
    showAs: string;
    stageCompleted: boolean;
    stageOutcome: string | null;
    stageURI: string;
    uri: string;
  };
}

export interface BillResult {
  bill: {
    uri: string;
    billNo: string;
    billYear: string;
    billType: string;
    shortTitleEn: string;
    shortTitleGa: string;
    longTitleEn: string;
    status: string;
    source: string;
    originHouse?: { showAs: string; uri: string };
    sponsors: BillSponsorRaw[];
    stages: BillStageRaw[];
    mostRecentStage: BillStageRaw | null;
    lastUpdated: string;
    events?: {
      event: { showAs: string; dates: { date: string }[] };
    }[];
    versions?: {
      version: {
        showAs: string;
        date: string;
        formats?: { pdf?: { uri: string }; xml?: { uri: string } };
      }
    }[];
    relatedDocs?: {
      relatedDoc: {
        showAs: string;
        date: string;
        formats?: { pdf?: { uri: string }; xml?: { uri: string } };
      }
    }[];
  };
  billSort: {
    billNoSort: number;
    billYearSort: number;
  };
  contextDate: string;
}

export interface BillDocument {
  title: string;
  date: string;
  pdfUri?: string;
  xmlUri?: string;
}

export interface Bill {
  uri: string;
  billNo: string;
  billYear: string;
  title: string;
  longTitleEn?: string;
  status: string;
  source: string;
  originHouse: string;
  sponsors: string[];
  currentStage: string;
  lastUpdated: string;
  stages?: BillStageRaw[];
  versions?: BillDocument[];
  relatedDocs?: BillDocument[];
}

// ── Activity summary (for enriched Overview tab) ─────────────────────────────

export interface ActivitySummary {
  totalDebates: number;
  totalVotes: number;
  totalQuestions: number;
  totalBills: number;
}

export interface VoteBreakdown {
  ta: number;
  nil: number;
  staon: number;
  sampleSize: number;
}
