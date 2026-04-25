package ie.oireachtas.explorer.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// --- Constituency ---

@JsonClass(generateAdapter = true)
data class ConstituencyResult(
    val results: List<ConstituencyItem>
)

@JsonClass(generateAdapter = true)
data class ConstituencyItem(
    @Json(name = "constituencyOrPanel") val constituency: ConstituencyDetail
)

@JsonClass(generateAdapter = true)
data class ConstituencyDetail(
    @Json(name = "representCode") val constituencyId: String,
    @Json(name = "showAs") val name: String,
    val uri: String
)

// --- Members ---

@JsonClass(generateAdapter = true)
data class MemberResult(
    val results: List<MemberItem>
)

@JsonClass(generateAdapter = true)
data class MemberItem(
    val member: MemberDetail
)

@JsonClass(generateAdapter = true)
data class MemberDetail(
    val memberCode: String,
    val uri: String,
    val fullName: String,
    val firstName: String? = null,
    val lastName: String? = null,
    @Json(name = "memberships") val memberships: List<Membership>? = null
)

@JsonClass(generateAdapter = true)
data class Membership(
    val membership: MembershipDetail? = null
)

@JsonClass(generateAdapter = true)
data class MembershipDetail(
    val uri: String? = null,
    val house: HouseRef? = null,
    val represents: List<RepresentRef>? = null,
    val parties: List<PartyRef>? = null,
    val offices: List<OfficeRef>? = null,
    val committees: List<CommitteeRaw>? = null,
    val dateRange: DateRange? = null
)

@JsonClass(generateAdapter = true)
data class HouseRef(
    val uri: String? = null,
    val showAs: String? = null,
    val houseCode: String? = null,
    val houseNo: String? = null,
    val chamberType: String? = null
)

@JsonClass(generateAdapter = true)
data class DateRange(
    val start: String? = null,
    val end: String? = null
)

@JsonClass(generateAdapter = true)
data class RepresentRef(
    val represent: RepresentDetail? = null
)

@JsonClass(generateAdapter = true)
data class RepresentDetail(
    val uri: String? = null,
    val showAs: String? = null,
    val representCode: String? = null,
    val representType: String? = null
)

@JsonClass(generateAdapter = true)
data class PartyRef(
    val party: PartyDetail? = null
)

@JsonClass(generateAdapter = true)
data class PartyDetail(
    val partyCode: String? = null,
    val showAs: String? = null,
    val uri: String? = null,
    val dateRange: DateRange? = null
)

@JsonClass(generateAdapter = true)
data class OfficeRef(
    val office: OfficeDetail? = null
)

@JsonClass(generateAdapter = true)
data class OfficeDetail(
    val officeName: OfficeNameRef? = null,
    val showAs: String? = null,
    val dateRange: DateRange? = null
)

@JsonClass(generateAdapter = true)
data class OfficeNameRef(
    val showAs: String? = null
)

@JsonClass(generateAdapter = true)
data class CommitteeRaw(
    val committeeCode: String? = null,
    val uri: String? = null,
    val committeeName: List<CommitteeNameEntry>? = null,
    val role: Any? = null, // can be [] or { title, dateRange }
    val status: String? = null,
    val memberDateRange: DateRange? = null
)

@JsonClass(generateAdapter = true)
data class CommitteeNameEntry(
    val nameEn: String? = null,
    val nameGa: String? = null,
    val dateRange: DateRange? = null
)

// --- Debates ---

@JsonClass(generateAdapter = true)
data class DebateResult(
    val results: List<DebateItem>,
    val head: DebateHead? = null
)

@JsonClass(generateAdapter = true)
data class DebateHead(
    val counts: DebateCounts? = null
)

@JsonClass(generateAdapter = true)
data class DebateCounts(
    val resultCount: Int? = null,
    val totalCount: Int? = null
)

@JsonClass(generateAdapter = true)
data class DebateItem(
    @Json(name = "debateRecord") val debate: DebateDetail
)

@JsonClass(generateAdapter = true)
data class DebateDetail(
    val uri: String,
    val date: String? = null,
    val debateType: String? = null,
    val formats: DebateFormats? = null,
    val debateSections: List<DebateSectionRef>? = null
)

@JsonClass(generateAdapter = true)
data class ChamberRef(
    val showAs: String? = null,
    val uri: String? = null
)

@JsonClass(generateAdapter = true)
data class DebateFormats(
    val xml: FormatRef? = null,
    val pdf: FormatRef? = null
)

@JsonClass(generateAdapter = true)
data class FormatRef(
    val uri: String? = null
)

@JsonClass(generateAdapter = true)
data class DebateSectionRef(
    val debateSection: DebateSectionDetail? = null
)

@JsonClass(generateAdapter = true)
data class DebateSectionDetail(
    val debateSectionId: String? = null,
    val showAs: String? = null,
    val uri: String? = null,
    val formats: DebateFormats? = null
)

// --- Votes / Divisions ---

@JsonClass(generateAdapter = true)
data class DivisionResult(
    val results: List<DivisionItem>,
    val head: DebateHead? = null
)

@JsonClass(generateAdapter = true)
data class DivisionItem(
    val division: DivisionDetail
)

@JsonClass(generateAdapter = true)
data class DivisionDetail(
    val uri: String,
    val date: String? = null,
    val showAs: String? = null,
    val subject: SubjectRef? = null,
    val outcome: String? = null,
    val tallies: Tallies? = null,
    val debate: DivisionDebateRef? = null,
    val memberTally: MemberTallyRef? = null,
    val voteId: String? = null
)

@JsonClass(generateAdapter = true)
data class SubjectRef(
    val showAs: String? = null
)

@JsonClass(generateAdapter = true)
data class MemberTallyRef(
    val member: MemberTallyMemberRef? = null,
    val showAs: String? = null
)

@JsonClass(generateAdapter = true)
data class MemberTallyMemberRef(
    val memberCode: String? = null,
    val showAs: String? = null,
    val uri: String? = null
)

@JsonClass(generateAdapter = true)
data class DivisionDebateRef(
    val uri: String? = null,
    val showAs: String? = null,
    val debateSection: String? = null,
    val formats: DebateFormats? = null
)

@JsonClass(generateAdapter = true)
data class Tallies(
    val nilVotes: TallyDetail? = null,
    val taVotes: TallyDetail? = null,
    val staonVotes: TallyDetail? = null
)

@JsonClass(generateAdapter = true)
data class TallyDetail(
    val tally: Int? = null,
    val showAs: String? = null
)

// --- Questions ---

@JsonClass(generateAdapter = true)
data class QuestionResult(
    val results: List<QuestionItem>,
    val head: DebateHead? = null
)

@JsonClass(generateAdapter = true)
data class QuestionItem(
    val question: QuestionDetail
)

@JsonClass(generateAdapter = true)
data class QuestionDetail(
    val uri: String,
    val date: String? = null,
    val showAs: String? = null,
    val questionType: String? = null,
    val questionNumber: Int? = null,
    val by: QuestionByRef? = null,
    val to: QuestionToRef? = null,
    val debateSection: QuestionDebateSectionRef? = null
)

@JsonClass(generateAdapter = true)
data class QuestionByRef(
    val memberCode: String? = null,
    val uri: String? = null,
    val showAs: String? = null
)

@JsonClass(generateAdapter = true)
data class QuestionToRef(
    val showAs: String? = null,
    val uri: String? = null
)

@JsonClass(generateAdapter = true)
data class QuestionDebateSectionRef(
    val debateSectionId: String? = null,
    val uri: String? = null,
    val formats: DebateFormats? = null
)

// --- Legislation ---

@JsonClass(generateAdapter = true)
data class LegislationResult(
    val results: List<LegislationItem>,
    val head: DebateHead? = null
)

@JsonClass(generateAdapter = true)
data class LegislationItem(
    val bill: BillDetail
)

@JsonClass(generateAdapter = true)
data class BillDetail(
    val uri: String,
    val billNo: String? = null,
    val billYear: String? = null,
    val shortTitleEn: String? = null,
    val longTitleEn: String? = null,
    val status: String? = null,
    val source: String? = null,
    val originHouse: ChamberRef? = null,
    val sponsors: List<SponsorRef>? = null,
    val stages: List<StageRef>? = null,
    val mostRecentStage: StageRef? = null,
    val lastUpdated: String? = null,
    val versions: List<BillVersionRef>? = null,
    val relatedDocs: List<RelatedDocRef>? = null
)

@JsonClass(generateAdapter = true)
data class BillVersionRef(
    val version: DocumentDetail
)

@JsonClass(generateAdapter = true)
data class RelatedDocRef(
    val relatedDoc: DocumentDetail
)

@JsonClass(generateAdapter = true)
data class DocumentDetail(
    val showAs: String? = null,
    val date: String? = null,
    val formats: DebateFormats? = null
)

@JsonClass(generateAdapter = true)
data class SponsorRef(
    val sponsor: SponsorDetail? = null
)

@JsonClass(generateAdapter = true)
data class SponsorDetail(
    val by: MemberRef? = null,
    val isPrimary: Boolean? = null
)

@JsonClass(generateAdapter = true)
data class MemberRef(
    val showAs: String? = null,
    val uri: String? = null
)

@JsonClass(generateAdapter = true)
data class StageRef(
    val event: StageEvent? = null
)

@JsonClass(generateAdapter = true)
data class StageEvent(
    val showAs: String? = null,
    val date: String? = null,
    val chamber: ChamberRef? = null
)

// App-level domain models (normalised from API)

data class Member(
    val uri: String,
    val memberCode: String,
    val fullName: String,
    val firstName: String?,
    val lastName: String?,
    val party: String,
    val constituency: String,
    val constituencyCode: String,
    val photoUrl: String,
    val offices: List<String>,
    val committees: List<CommitteeMembership>
)

data class CommitteeMembership(
    val name: String,
    val uri: String?,
    val role: String
)

data class SpeechSegment(
    val speakerId: String,
    val speakerName: String,
    val memberUri: String?,
    var paragraphs: List<String>
)

// Normalised domain models for display

data class Debate(
    val uri: String,
    val date: String,
    val title: String,
    val chamber: String,
    val xmlUri: String?,
    val sections: List<DebateSection>,
    val debateSectionUri: String?
)

data class DebateSection(
    val uri: String,
    val title: String
)

data class Division(
    val uri: String,
    val date: String,
    val title: String,
    val voteType: String, // "ta", "nil", "staon"
    val voteLabel: String,
    val outcome: String,
    val tallyFor: Int,
    val tallyAgainst: Int,
    val xmlUri: String?,
    val debateSectionUri: String?
)

data class Question(
    val uri: String,
    val date: String,
    val questionType: String,
    val questionNumber: Int,
    val questionText: String,
    val askedBy: String,
    val department: String,
    val role: String, // "asked" or "answered"
    val xmlUri: String?,
    val debateSectionUri: String?
)

data class BillDocument(
    val title: String,
    val date: String?,
    val pdfUri: String?,
    val xmlUri: String?
)

data class Bill(
    val uri: String,
    val billNo: String,
    val billYear: String,
    val title: String,
    val longTitleEn: String?,
    val status: String,
    val source: String?,
    val originHouse: String,
    val sponsors: List<String>,
    val currentStage: String,
    val lastUpdated: String?,
    val versions: List<BillDocument>,
    val relatedDocs: List<BillDocument>
)

data class ActivitySummary(
    val totalDebates: Int,
    val totalVotes: Int,
    val totalQuestions: Int,
    val totalBills: Int
)

data class VoteBreakdown(
    val ta: Int,
    val nil: Int,
    val staon: Int,
    val sampleSize: Int
)
