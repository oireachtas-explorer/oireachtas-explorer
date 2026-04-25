import Foundation

// MARK: - API envelope

struct APIResult<T: Decodable>: Decodable {
    let results: [T]
    let head: APIHead?
}

struct APIHead: Decodable {
    let counts: APICounts?
}

struct APICounts: Decodable {
    let resultCount: Int?
    let totalCount: Int?
}

// MARK: - Constituency API types

struct ConstituencyItem: Decodable {
    let constituency: ConstituencyRaw
    enum CodingKeys: String, CodingKey {
        case constituency = "constituencyOrPanel"
    }
}

struct ConstituencyRaw: Decodable {
    let code: String
    let name: String
    let uri: String
    enum CodingKeys: String, CodingKey {
        case code = "representCode"
        case name = "showAs"
        case uri
    }
}

// MARK: - Member API types

struct MemberItem: Decodable {
    let member: MemberRaw
}

struct MemberRaw: Decodable {
    let memberCode: String
    let uri: String
    let fullName: String
    let firstName: String?
    let lastName: String?
    let memberships: [MembershipWrapper]?
}

struct MembershipWrapper: Decodable {
    let membership: MembershipRaw?
}

struct MembershipRaw: Decodable {
    let house: HouseRef?
    let represents: [RepresentWrapper]?
    let parties: [PartyWrapper]?
    let offices: [OfficeWrapper]?
    let committees: [CommitteeRaw]?
    let dateRange: DateRangeRaw?
}

struct HouseRef: Decodable {
    let showAs: String?
    let houseCode: String?
    let houseNo: String?
}

struct DateRangeRaw: Decodable {
    let start: String?
    let end: String?
}

struct RepresentWrapper: Decodable {
    let represent: RepresentRaw?
}

struct RepresentRaw: Decodable {
    let showAs: String?
    let representCode: String?
    let representType: String?
}

struct PartyWrapper: Decodable {
    let party: PartyRaw?
}

struct PartyRaw: Decodable {
    let showAs: String?
    let dateRange: DateRangeRaw?
}

struct OfficeWrapper: Decodable {
    let office: OfficeRaw?
}

struct OfficeRaw: Decodable {
    let officeName: OfficeNameRaw?
    let showAs: String?
    let dateRange: DateRangeRaw?
}

struct OfficeNameRaw: Decodable {
    let showAs: String?
}

struct CommitteeRaw: Decodable {
    let committeeCode: String?
    let uri: String?
    let committeeName: [CommitteeNameEntry]?
    let status: String?
    let memberDateRange: DateRangeRaw?
}

struct CommitteeNameEntry: Decodable {
    let nameEn: String?
    let nameGa: String?
}

// MARK: - Debate API types

struct DebateItem: Decodable {
    let debate: DebateRaw
    enum CodingKeys: String, CodingKey {
        case debate = "debateRecord"
    }
}

struct DebateRaw: Decodable {
    let uri: String
    let date: String?
    let debateType: String?
    let formats: DebateFormats?
    let debateSections: [DebateSectionWrapper]?
}

struct DebateFormats: Decodable {
    let xml: FormatRef?
    let pdf: FormatRef?
}

struct FormatRef: Decodable {
    let uri: String?
}

struct DebateSectionWrapper: Decodable {
    let debateSection: DebateSectionRaw?
}

struct DebateSectionRaw: Decodable {
    let debateSectionId: String?
    let showAs: String?
    let uri: String?
    let formats: DebateFormats?
}

// MARK: - Division API types

struct DivisionItem: Decodable {
    let division: DivisionRaw
}

struct DivisionRaw: Decodable {
    let uri: String
    let date: String?
    let showAs: String?
    let subject: SubjectRef?
    let outcome: String?
    let tallies: Tallies?
    let memberTally: MemberTallyRaw?
}

struct SubjectRef: Decodable {
    let showAs: String?
}

struct MemberTallyRaw: Decodable {
    let showAs: String?
}

struct Tallies: Decodable {
    let nilVotes: TallyDetail?
    let taVotes: TallyDetail?
    let staonVotes: TallyDetail?
}

struct TallyDetail: Decodable {
    let tally: Int?
}

// MARK: - Question API types

struct QuestionItem: Decodable {
    let question: QuestionRaw
}

struct QuestionRaw: Decodable {
    let uri: String
    let date: String?
    let showAs: String?
    let questionType: String?
    let questionNumber: Int?
    let by: QuestionByRef?
    let to: QuestionToRef?
    let debateSection: QuestionDebateSectionRef?
}

struct QuestionByRef: Decodable {
    let showAs: String?
    let uri: String?
}

struct QuestionToRef: Decodable {
    let showAs: String?
}

struct QuestionDebateSectionRef: Decodable {
    let uri: String?
    let formats: DebateFormats?
}

// MARK: - Legislation API types

struct LegislationItem: Decodable {
    let bill: BillRaw
}

struct BillRaw: Decodable {
    let uri: String
    let billNo: String?
    let billYear: String?
    let shortTitleEn: String?
    let longTitleEn: String?
    let status: String?
    let source: String?
    let originHouse: ChamberRef?
    let sponsors: [SponsorWrapper]?
    let stages: [StageWrapper]?
    let mostRecentStage: StageWrapper?
    let lastUpdated: String?
    let versions: [BillVersionWrapper]?
}

struct ChamberRef: Decodable {
    let showAs: String?
}

struct SponsorWrapper: Decodable {
    let sponsor: SponsorRaw?
}

struct SponsorRaw: Decodable {
    let by: MemberRefSimple?
    let isPrimary: Bool?
}

struct MemberRefSimple: Decodable {
    let showAs: String?
    let uri: String?
}

struct StageWrapper: Decodable {
    let event: StageEventRaw?
}

struct StageEventRaw: Decodable {
    let showAs: String?
    let date: String?
    let chamber: ChamberRef?
}

struct BillVersionWrapper: Decodable {
    let version: DocumentRaw
}

struct DocumentRaw: Decodable {
    let showAs: String?
    let date: String?
    let formats: DebateFormats?
}

// MARK: - Domain Models

struct Constituency: Identifiable, Hashable {
    let id: String   // representCode
    let name: String
    let uri: String
}

struct Member: Identifiable {
    let id: String           // memberCode
    let uri: String
    let memberCode: String
    let fullName: String
    let firstName: String?
    let lastName: String?
    let party: String
    let constituency: String
    let constituencyCode: String
    let photoUrl: String
    let offices: [String]
    let committees: [CommitteeMembership]

    var initials: String {
        let f = firstName?.first.map(String.init) ?? ""
        let l = lastName?.first.map(String.init) ?? String(fullName.last.map(String.init) ?? "")
        return (f + l).uppercased()
    }

    var primaryOffice: String? { offices.first }
}

struct CommitteeMembership: Identifiable {
    let id = UUID()
    let name: String
    let uri: String?
    let role: String
}

// MARK: - Shared DateFormatters
// Reused across every list row — creating these per-row is expensive enough
// to show up in scroll profiling.

private let isoDateFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    df.locale = Locale(identifier: "en_IE")
    return df
}()

private let displayDateFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "d MMM yyyy"
    df.locale = Locale(identifier: "en_IE")
    return df
}()

private let monthKeyFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM"
    return df
}()

private let monthDisplayFormatter: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "MMMM yyyy"
    df.locale = Locale(identifier: "en_IE")
    return df
}()

func formatRawDate(_ raw: String) -> String {
    guard let d = isoDateFormatter.date(from: raw) else { return raw }
    return displayDateFormatter.string(from: d)
}

func formatMonthKey(_ key: String) -> String {
    guard let d = monthKeyFormatter.date(from: key) else { return key }
    return monthDisplayFormatter.string(from: d)
}

struct Debate: Identifiable {
    let id: String
    let uri: String
    let date: String
    let title: String
    let debateType: String
    let chamber: String
    let xmlUri: String?

    var formattedDate: String { formatRawDate(date) }
    var monthKey: String { String(date.prefix(7)) }
    var monthLabel: String { formatMonthKey(monthKey) }
}

struct Division: Identifiable {
    let id: String
    let uri: String
    let date: String
    let title: String
    let voteType: String    // "ta" | "nil" | "staon"
    let outcome: String
    let tallyFor: Int
    let tallyAgainst: Int

    var formattedDate: String { formatRawDate(date) }
    var voteLabel: String {
        switch voteType {
        case "ta": return "Tá"
        case "nil": return "Níl"
        default: return "Staon"
        }
    }
    var isCarried: Bool { outcome.lowercased().contains("carr") }
}

struct Question: Identifiable {
    let id: String
    let uri: String
    let date: String
    let questionType: String
    let questionText: String
    let department: String
    let xmlUri: String?

    var formattedDate: String { formatRawDate(date) }
    var typeLabel: String { questionType.capitalized }
}

struct Bill: Identifiable {
    let id: String
    let uri: String
    let billNo: String
    let billYear: String
    let title: String
    let longTitle: String?
    let status: String
    let originHouse: String
    let sponsors: [String]
    let stages: [BillStage]
    let pdfUri: String?

    var isEnacted: Bool { status.lowercased().contains("enacted") }
}

struct BillStage: Identifiable {
    let id = UUID()
    let name: String
    let date: String?
    let isDone: Bool
    let isCurrent: Bool
}

// MARK: - Photo URL helper

func memberPhotoUrl(_ memberUri: String) -> String {
    "\(memberUri)/image/thumb"
}

// MARK: - Dáil metadata

let currentDailNo = 34
let currentDailChamberUri = "https://data.oireachtas.ie/ie/oireachtas/house/dail/\(currentDailNo)"
