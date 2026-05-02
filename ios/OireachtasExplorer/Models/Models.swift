import Foundation

// MARK: - App navigation and session state

enum Chamber: String, CaseIterable, Identifiable, Codable, Hashable {
    case dail
    case seanad

    var id: String { rawValue }

    var title: String {
        switch self {
        case .dail: return "Dáil"
        case .seanad: return "Seanad"
        }
    }

    var memberNoun: String {
        switch self {
        case .dail: return "TD"
        case .seanad: return "Senator"
        }
    }

    var pluralMemberNoun: String {
        switch self {
        case .dail: return "TDs"
        case .seanad: return "Senators"
        }
    }

    var latestHouseNo: Int {
        switch self {
        case .dail: return latestDailNo
        case .seanad: return latestSeanadNo
        }
    }
}

struct HouseInfo: Identifiable, Hashable {
    let houseNo: Int
    let year: Int

    var id: Int { houseNo }
    var ordinal: String { "\(houseNo)\(ordinalSuffix(houseNo))" }

    func label(for chamber: Chamber) -> String {
        "\(ordinal) \(chamber.title)"
    }

    func fullLabel(for chamber: Chamber) -> String {
        year > 0 ? "\(label(for: chamber)) (\(year))" : label(for: chamber)
    }
}

enum AppRoute: Hashable {
    case globalSearch(query: String?)
    case globalDebates
    case globalLegislation
    case debateViewer(xmlUri: String, debateSectionUri: String, title: String, focusMemberUri: String?)
    case billViewer(billNo: String, billYear: String)
    case savedItems
    case publicCollection(slug: String)
    case compareMembers
    case partyMembers(partyName: String)
    case constituencyMembers(code: String, name: String)
    case memberProfile(memberUri: String, memberName: String, constituencyCode: String, constituencyName: String)
    case committee(uri: String, name: String)
    case about
}

enum SavedResearchItemType: String, Codable {
    case member
    case bill
    case debate
    case speech
    case question
    case unknown

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        self = SavedResearchItemType(rawValue: raw) ?? .unknown
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }

    var label: String {
        switch self {
        case .member: return "Member"
        case .bill: return "Bill"
        case .debate: return "Debate"
        case .speech: return "Transcript passage"
        case .question: return "Question"
        case .unknown: return "Research item"
        }
    }
}

struct SavedResearchItem: Identifiable, Decodable {
    let id: String
    let type: SavedResearchItemType
    let title: String
    let subtitle: String?
    let citation: String?
    let quote: String?
    let sourceDate: String?
    let urlHash: String
    let chamber: Chamber?
    let houseNo: Int?
    let savedAt: String
}

extension SavedResearchItem: Encodable {}

struct PublicResearchCollection: Decodable {
    let slug: String
    let title: String
    let description: String?
    let createdAt: String
    let itemCount: Int
    let items: [SavedResearchItem]
}

enum SavedResearchStore {
    private static let storageKey = "oireachtas-explorer:saved-items"

    static func load() -> [SavedResearchItem] {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return [] }
        let items = (try? JSONDecoder().decode([SavedResearchItem].self, from: data)) ?? []
        return items.sorted { $0.savedAt > $1.savedAt }
    }

    static func isSaved(id: String) -> Bool {
        load().contains { $0.id == id }
    }

    @discardableResult
    static func toggle(_ item: SavedResearchItem) -> Bool {
        var items = load()
        if items.contains(where: { $0.id == item.id }) {
            items.removeAll { $0.id == item.id }
            save(items)
            return false
        }

        items.insert(item.withSavedAt(Date().iso8601String), at: 0)
        save(items)
        return true
    }

    static func remove(id: String) {
        save(load().filter { $0.id != id })
    }

    static func buildDossier(items: [SavedResearchItem]) -> String {
        var lines = [
            "# Oireachtas Explorer Research Dossier",
            "",
            "Generated: \(Date().displayString)",
            ""
        ]

        for item in items {
            lines.append("## \(item.title)")
            lines.append("")
            lines.append("- Type: \(item.type.label)")
            lines.append("- Saved: \(formatPublicCollectionDateValue(item.savedAt))")
            if let sourceDate = item.sourceDate, !sourceDate.isEmpty {
                lines.append("- Source date: \(formatPublicCollectionDateValue(sourceDate))")
            }
            if let subtitle = item.subtitle, !subtitle.isEmpty {
                lines.append("- Context: \(subtitle)")
            }
            lines.append("- Link: \(item.urlHash)")
            if let citation = item.citation, !citation.isEmpty {
                lines.append("- Citation: \(citation)")
            }
            if let quote = item.quote, !quote.isEmpty {
                lines.append("")
                lines.append("> \(quote.replacingOccurrences(of: "\n", with: "\n> "))")
            }
            lines.append("")
        }

        return lines.joined(separator: "\n")
    }

    private static func save(_ items: [SavedResearchItem]) {
        guard let data = try? JSONEncoder().encode(items) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}

private extension SavedResearchItem {
    func withSavedAt(_ value: String) -> SavedResearchItem {
        SavedResearchItem(
            id: id,
            type: type,
            title: title,
            subtitle: subtitle,
            citation: citation,
            quote: quote,
            sourceDate: sourceDate,
            urlHash: urlHash,
            chamber: chamber,
            houseNo: houseNo,
            savedAt: value
        )
    }
}

private extension Date {
    var iso8601String: String {
        ISO8601DateFormatter().string(from: self)
    }

    var displayString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_IE")
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
}

func formatPublicCollectionDateValue(_ raw: String) -> String {
    let dateOnly = String(raw.prefix(10))
    return formatRawDate(dateOnly)
}

private func ordinalSuffix(_ value: Int) -> String {
    if value % 100 >= 11 && value % 100 <= 13 { return "th" }
    switch value % 10 {
    case 1: return "st"
    case 2: return "nd"
    case 3: return "rd"
    default: return "th"
    }
}

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
    let relatedDocs: [RelatedDocumentWrapper]?
}

struct ChamberRef: Decodable {
    let showAs: String?
}

struct SponsorWrapper: Decodable {
    let sponsor: SponsorRaw?
}

struct SponsorRaw: Decodable {
    let by: MemberRefSimple?
    let `as`: MemberRefSimple?
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
    let uri: String?
    let showAs: String?
    let date: String?
    let dates: [StageEventDateRaw]?
    let house: ChamberRef?
    let chamber: ChamberRef?
    let stageOutcome: String?
    let stageCompleted: Bool?
    let progressStage: Int?
}

struct StageEventDateRaw: Decodable {
    let date: String?
}

struct BillVersionWrapper: Decodable {
    let version: DocumentRaw
}

struct RelatedDocumentWrapper: Decodable {
    let relatedDoc: DocumentRaw
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
    let rawXmlUri: String?
    let debateSectionUri: String?

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
    let rawXmlUri: String?
    let debateSectionUri: String?

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
    let source: String
    let originHouse: String
    let sponsors: [String]
    let currentStage: String
    let currentStageProgress: Int?
    let currentStageCompleted: Bool?
    let lastUpdated: String?
    let stages: [BillStage]
    let pdfUri: String?
    let versions: [BillDocument]
    let relatedDocs: [BillDocument]

    var isEnacted: Bool { status.lowercased().contains("enacted") }
}

struct BillStage: Identifiable {
    let id: String
    let name: String
    let date: String?
    let house: String
    let outcome: String?
    let isDone: Bool
    let isCurrent: Bool
}

struct BillDocument: Identifiable {
    let id: String
    let title: String
    let date: String?
    let pdfUri: String?
    let xmlUri: String?
}

// MARK: - Photo URL helper

func memberPhotoUrl(_ memberUri: String) -> String {
    "\(memberUri)/image/thumb"
}

// MARK: - Dáil metadata

let latestDailNo = 34
let seanadDailOffset = 7
let latestSeanadNo = latestDailNo - seanadDailOffset

// Back-compat for the current migration. Prefer AppSessionModel/chamber-aware
// helpers in new code.
let currentDailNo = latestDailNo
let currentDailChamberUri = "https://data.oireachtas.ie/ie/oireachtas/house/dail/\(currentDailNo)"

let dailYears: [Int: Int] = [
    1: 1919, 2: 1921, 3: 1922, 4: 1923, 5: 1927, 6: 1927,
    7: 1932, 8: 1933, 9: 1937, 10: 1938, 11: 1943, 12: 1944,
    13: 1948, 14: 1951, 15: 1954, 16: 1957, 17: 1961, 18: 1965,
    19: 1969, 20: 1973, 21: 1977, 22: 1981, 23: 1982, 24: 1982,
    25: 1987, 26: 1989, 27: 1992, 28: 1997, 29: 2002, 30: 2007,
    31: 2011, 32: 2016, 33: 2020, 34: 2024,
]

let seanadYears: [Int: Int] = Dictionary(
    uniqueKeysWithValues: dailYears.compactMap { dailNo, year in
        let seanadNo = dailNo - seanadDailOffset
        return seanadNo >= 1 ? (seanadNo, year) : nil
    }
)

func houseList(for chamber: Chamber) -> [HouseInfo] {
    let latest = chamber.latestHouseNo
    let years = chamber == .dail ? dailYears : seanadYears
    return stride(from: latest, through: 1, by: -1).map {
        HouseInfo(houseNo: $0, year: years[$0] ?? 0)
    }
}

func houseUri(chamber: Chamber, houseNo: Int) -> String {
    "https://data.oireachtas.ie/ie/oireachtas/house/\(chamber.rawValue)/\(houseNo)"
}

func pairedHouse(chamber: Chamber, houseNo: Int) -> (chamber: Chamber, houseNo: Int)? {
    switch chamber {
    case .dail:
        let seanadNo = houseNo - seanadDailOffset
        return seanadNo >= 1 && seanadNo <= latestSeanadNo ? (.seanad, seanadNo) : nil
    case .seanad:
        let dailNo = houseNo + seanadDailOffset
        return dailNo >= 1 && dailNo <= latestDailNo ? (.dail, dailNo) : nil
    }
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}
