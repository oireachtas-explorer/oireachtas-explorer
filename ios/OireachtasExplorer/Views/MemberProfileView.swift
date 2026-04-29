import SwiftUI
import SafariServices

// MARK: - Profile ViewModel

@MainActor
final class MemberProfileViewModel: ObservableObject {
    @Published var debates: [Debate] = []
    @Published var votes: [Division] = []
    @Published var questions: [Question] = []
    @Published var bills: [Bill] = []
    @Published var counts: (debates: Int, votes: Int, questions: Int, bills: Int) = (0, 0, 0, 0)
    @Published var loadingDebates = false
    @Published var loadingVotes = false
    @Published var loadingQuestions = false
    @Published var loadingBills = false
    @Published var loadingCounts = false

    var debatesLoaded = false
    var votesLoaded = false
    var questionsLoaded = false
    var billsLoaded = false
    var countsLoaded = false

    func loadCounts(memberUri: String) async {
        guard !countsLoaded else { return }
        countsLoaded = true
        loadingCounts = true
        if let c = try? await OireachtasAPI.shared.memberCounts(memberUri: memberUri) {
            counts = c
        }
        loadingCounts = false
    }

    func loadDebates(memberUri: String) async {
        guard !debatesLoaded else { return }
        debatesLoaded = true
        loadingDebates = true
        if let (d, _) = try? await OireachtasAPI.shared.getDebates(memberUri: memberUri, limit: 20) {
            debates = d
        }
        loadingDebates = false
    }

    func loadVotes(memberUri: String) async {
        guard !votesLoaded else { return }
        votesLoaded = true
        loadingVotes = true
        if let v = try? await OireachtasAPI.shared.getDivisions(memberUri: memberUri, limit: 50) {
            votes = v
        }
        loadingVotes = false
    }

    func loadQuestions(memberUri: String) async {
        guard !questionsLoaded else { return }
        questionsLoaded = true
        loadingQuestions = true
        if let q = try? await OireachtasAPI.shared.getQuestions(memberUri: memberUri, limit: 20) {
            questions = q
        }
        loadingQuestions = false
    }

    func loadBills(memberUri: String) async {
        guard !billsLoaded else { return }
        billsLoaded = true
        loadingBills = true
        if let b = try? await OireachtasAPI.shared.getLegislation(memberUri: memberUri, limit: 20) {
            bills = b
        }
        loadingBills = false
    }
}

// MARK: - Profile View

struct MemberProfileView: View {
    let member: Member
    @StateObject private var vm = MemberProfileViewModel()
    @State private var activeTab = "Overview"
    @State private var activeURL: URL?

    private let tabs = ["Overview", "Debates", "Votes", "Questions", "Legislation"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    profileHeader
                    tabBar
                    tabContent
                }
            }
            .background(Color.cream)
            .refreshable {
                loadTabData(activeTab, force: true)
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(item: $activeURL) { url in
                SafariView(url: url).ignoresSafeArea()
            }
        }
    }

    // MARK: - Profile header card

    private var profileHeader: some View {
        VStack(spacing: 0) {
            // Party stripe
            Rectangle()
                .fill(partyColor(member.party))
                .frame(height: 5)

            VStack(spacing: 12) {
                // Photo + info row
                HStack(alignment: .center, spacing: 12) {
                    AvatarView(member: member, size: 58)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(member.fullName)
                            .font(.dmSerif(size: 18))
                            .foregroundColor(Color.headingText)
                        HStack(spacing: 6) {
                            NavigationLink(destination: FilteredMembersView(filter: .party(member.party))) {
                                PartyBadge(party: member.party, small: true)
                            }
                            .buttonStyle(.plain)
                            
                            Text(member.constituency)
                                .font(.inter(size: 12))
                                .foregroundColor(Color.secondaryText)
                        }
                        if let office = member.primaryOffice {
                            Text(office)
                                .font(.inter(size: 10, weight: .semibold))
                                .foregroundColor(Color.gold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(Color.voteGoldBg)
                                .clipShape(Capsule())
                        }
                    }
                    Spacer()
                }
            }
            .padding(16)
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.04), radius: 3, x: 0, y: 1)
        .padding(16)
    }

    // MARK: - Tab bar

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(tabs, id: \.self) { tab in
                    Button {
                        activeTab = tab
                        loadTabData(tab)
                    } label: {
                        VStack(spacing: 0) {
                            Text(tab)
                                .font(.inter(size: 12, weight: activeTab == tab ? .semibold : .medium))
                                .foregroundColor(activeTab == tab ? Color.darkGreen : Color.mutedText)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 11)
                                .frame(minHeight: 44)
                            Rectangle()
                                .fill(activeTab == tab ? Color.darkGreen : Color.clear)
                                .frame(height: 2.5)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
        .overlay(Rectangle().frame(height: 2).foregroundColor(Color.cardBorder), alignment: .bottom)
        .background(Color.white)
        .onAppear { loadTabData("Overview") }
    }

    private func loadTabData(_ tab: String, force: Bool = false) {
        let uri = member.uri
        switch tab {
        case "Overview":
            if force { vm.countsLoaded = false }
            Task { await vm.loadCounts(memberUri: uri) }
        case "Debates":
            if force { vm.debatesLoaded = false }
            Task { await vm.loadDebates(memberUri: uri) }
        case "Votes":
            if force { vm.votesLoaded = false }
            Task { await vm.loadVotes(memberUri: uri) }
        case "Questions":
            if force { vm.questionsLoaded = false }
            Task { await vm.loadQuestions(memberUri: uri) }
        case "Legislation":
            if force { vm.billsLoaded = false }
            Task { await vm.loadBills(memberUri: uri) }
        default: break
        }
    }

    // MARK: - Tab content router

    @ViewBuilder
    private var tabContent: some View {
        switch activeTab {
        case "Overview":    overviewTab
        case "Debates":     debatesTab
        case "Votes":       votesTab
        case "Questions":   questionsTab
        case "Legislation": legislationTab
        default: EmptyView()
        }
    }

    // MARK: - Overview Tab

    private var overviewTab: some View {
        VStack(spacing: 0) {
            LazyVGrid(
                columns: [GridItem(.flexible()), GridItem(.flexible())],
                spacing: 8
            ) {
                overviewStatCard("Debates",   value: countLabel(vm.counts.debates))
                overviewStatCard("Votes",     value: countLabel(vm.counts.votes))
                overviewStatCard("Questions", value: countLabel(vm.counts.questions))
                overviewStatCard("Bills",     value: countLabel(vm.counts.bills))
            }
            .padding(16)

            if !member.committees.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Committees")
                        .font(.dmSerif(size: 18))
                        .foregroundColor(Color.headingText)
                    ForEach(member.committees) { c in
                        NavigationLink(destination: FilteredMembersView(filter: .committee(c.name))) {
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(partyColor(member.party))
                                    .frame(width: 6, height: 6)
                                Text(c.name)
                                    .font(.inter(size: 13))
                                    .foregroundColor(Color.bodyText)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(Color.mutedText)
                            }
                            .padding(.vertical, 4)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
    }

    private func countLabel(_ n: Int) -> String {
        // Show a dash while counts are loading rather than a misleading "0"
        if vm.loadingCounts && n == 0 { return "…" }
        return "\(n)"
    }

    private func overviewStatCard(_ label: String, value: String) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.dmSerif(size: 24))
                .foregroundColor(Color.darkGreen)
            Text(label.uppercased())
                .font(.inter(size: 9, weight: .bold))
                .tracking(0.7)
                .foregroundColor(Color.mutedText)
        }
        .frame(maxWidth: .infinity)
        .padding(14)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
    }

    // MARK: - Debates Tab

    private var debatesTab: some View {
        LazyVStack(spacing: 8) {
            if vm.loadingDebates {
                LoadingView()
            } else if vm.debates.isEmpty {
                emptyState("No debates found")
            } else {
                ForEach(vm.debates) { d in
                    VStack(alignment: .leading, spacing: 0) {
                        DebateItemRow(title: d.title, date: d.formattedDate, typeLabel: d.debateType)
                        
                        if let xmlUri = d.rawXmlUri, let sectionUri = d.debateSectionUri {
                            NavigationLink(destination: DebateTranscriptView(title: d.title, xmlUri: xmlUri, debateSectionUri: sectionUri, focusMemberUri: member.uri)) {
                                Text("View Transcript")
                                    .font(.inter(size: 12, weight: .semibold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 7)
                                    .background(Color.darkGreen)
                                    .clipShape(Capsule())
                                    .padding(.horizontal, 14)
                                    .padding(.bottom, 14)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
                    .padding(.horizontal, 16)
                }
            }
        }
        .padding(.vertical, 12)
    }

    // MARK: - Votes Tab

    private var votesTab: some View {
        LazyVStack(spacing: 8) {
            if vm.loadingVotes {
                LoadingView()
            } else if vm.votes.isEmpty {
                emptyState("No votes found")
            } else {
                ForEach(vm.votes) { v in
                    voteRow(v)
                        .padding(.horizontal, 16)
                }
            }
        }
        .padding(.vertical, 12)
    }

    private func voteRow(_ v: Division) -> some View {
        HStack(spacing: 10) {
            // Tá / Níl indicator
            ZStack {
                Circle()
                    .fill(v.voteType == "ta" ? Color.voteTaBg : Color.voteNilBg)
                Text(v.voteLabel)
                    .font(.dmSerif(size: 11))
                    .foregroundColor(v.voteType == "ta" ? Color.voteTaFg : Color.voteNilFg)
            }
            .frame(width: 34, height: 34)

            VStack(alignment: .leading, spacing: 4) {
                Text(v.title)
                    .font(.inter(size: 12, weight: .semibold))
                    .foregroundColor(Color.headingText)
                    .lineLimit(2)
                HStack(spacing: 6) {
                    Text(v.formattedDate)
                        .font(.inter(size: 11))
                        .foregroundColor(Color.mutedText)
                    Text(v.outcome.uppercased())
                        .font(.inter(size: 9, weight: .bold))
                        .tracking(0.4)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(v.isCarried ? Color(hex: "d8f0dd") : Color.voteNilBg)
                        .foregroundColor(v.isCarried ? Color.darkGreen : Color.voteNilFg)
                        .clipShape(Capsule())
                }
            }
            Spacer()
            

        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
    }

    // MARK: - Questions Tab

    private var questionsTab: some View {
        LazyVStack(spacing: 10) {
            if vm.loadingQuestions {
                LoadingView()
            } else if vm.questions.isEmpty {
                emptyState("No questions found")
            } else {
                ForEach(vm.questions) { q in
                    questionCard(q)
                        .padding(.horizontal, 16)
                }
            }
        }
        .padding(.vertical, 12)
    }

    private func questionCard(_ q: Question) -> some View {
        VStack(spacing: 0) {
            // Header
            HStack(spacing: 6) {
                PartyBadge(party: member.party, small: true)
                Text(q.typeLabel.uppercased())
                    .font(.inter(size: 9, weight: .bold))
                    .tracking(0.5)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(Color(hex: "e3f0ff"))
                    .foregroundColor(Color(hex: "1a5296"))
                    .clipShape(Capsule())
                Text(q.formattedDate)
                    .font(.inter(size: 10))
                    .foregroundColor(Color.mutedText)
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color(hex: "f0ede6"))

            // Question text
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 5) {
                    RoundedRectangle(cornerRadius: 2).fill(Color.darkGreen)
                        .frame(width: 3, height: 10)
                    Text("QUESTION")
                        .font(.inter(size: 9, weight: .bold))
                        .tracking(1.0)
                        .foregroundColor(Color.mutedText)
                }
                Text(q.questionText)
                    .font(.inter(size: 13))
                    .foregroundColor(Color.bodyText)
                    .lineSpacing(4)
            }
            .padding(14)

            if !q.department.isEmpty {
                // Response indicator
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 5) {
                        RoundedRectangle(cornerRadius: 2).fill(Color.gold)
                            .frame(width: 3, height: 10)
                        Text("RESPONSE")
                            .font(.inter(size: 9, weight: .bold))
                            .tracking(1.0)
                            .foregroundColor(Color.gold)
                    }
                    Text(q.department)
                        .font(.inter(size: 12, weight: .semibold))
                        .foregroundColor(Color.headingText)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(Color(hex: "fdf9ec"))
                .overlay(
                    Rectangle().frame(height: 1).foregroundColor(Color(hex: "f5e8c0")),
                    alignment: .top
                )
            }
            
            // Link to question
            if let xmlUri = q.rawXmlUri, let sectionUri = q.debateSectionUri {
                NavigationLink(destination: DebateTranscriptView(title: q.questionText, xmlUri: xmlUri, debateSectionUri: sectionUri, focusMemberUri: member.uri)) {
                    HStack {
                        Text("View Full Question & Response")
                            .font(.inter(size: 12, weight: .semibold))
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .foregroundColor(Color.darkGreen)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color.white)
                    .overlay(Rectangle().frame(height: 1).foregroundColor(Color.cardBorder), alignment: .top)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.03), radius: 2, x: 0, y: 1)
    }

    // MARK: - Legislation Tab

    private var legislationTab: some View {
        LazyVStack(spacing: 12) {
            if vm.loadingBills {
                LoadingView()
            } else if vm.bills.isEmpty {
                emptyState("No legislation found")
            } else {
                ForEach(vm.bills) { bill in
                    billCard(bill)
                        .padding(.horizontal, 16)
                }
            }
        }
        .padding(.vertical, 12)
    }

    private func billCard(_ bill: Bill) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 10) {
                // Status badges
                HStack(spacing: 7) {
                    Text(bill.status)
                        .font(.inter(size: 10, weight: .bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(bill.isEnacted ? Color(hex: "d8f0dd") : Color(hex: "e8eef8"))
                        .foregroundColor(bill.isEnacted ? Color.darkGreen : Color(hex: "1e3a7a"))
                        .clipShape(Capsule())

                    if bill.sponsors.contains(where: { _ in true }) {
                        Text("Primary Sponsor")
                            .font(.inter(size: 10, weight: .bold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.voteGoldBg)
                            .foregroundColor(Color.gold)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Color(hex: "f5e8c0"), lineWidth: 1))
                    }
                }

                // Title
                Text(bill.title)
                    .font(.dmSerif(size: 16))
                    .foregroundColor(Color.headingText)
                    .lineSpacing(2)

                // Long title
                if let longTitle = bill.longTitle {
                    Text(longTitle)
                        .font(.inter(size: 12))
                        .italic()
                        .foregroundColor(Color.secondaryText)
                        .lineSpacing(3)
                        .padding(.leading, 10)
                        .overlay(
                            Rectangle()
                                .fill(Color.cardBorder)
                                .frame(width: 3),
                            alignment: .leading
                        )
                }

                // Stage progress
                if !bill.stages.isEmpty {
                    StageDots(stages: bill.stages)
                }
            }
            .padding(16)

            // Actions
            HStack(spacing: 10) {
                if let pdfUriStr = bill.pdfUri, let pdfUrl = URL(string: pdfUriStr) {
                    Button {
                        activeURL = pdfUrl
                    } label: {
                        Label("View Bill PDF", systemImage: "doc.fill")
                            .font(.inter(size: 13, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 10)
                            .background(Color.darkGreen)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }

                if let pdfUriStr = bill.pdfUri, let pdfUrl = URL(string: pdfUriStr) {
                    Link(destination: pdfUrl) {
                        Text("Open in new tab ↗")
                            .font(.inter(size: 12, weight: .semibold))
                            .foregroundColor(Color.secondaryText)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(Rectangle().frame(height: 1).foregroundColor(Color.cardBorder), alignment: .top)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.04), radius: 3, x: 0, y: 1)
    }

    // MARK: - Empty state

    private func emptyState(_ message: String) -> some View {
        Text(message)
            .font(.inter(size: 14))
            .foregroundColor(Color.mutedText)
            .frame(maxWidth: .infinity)
            .padding(32)
    }
}

#Preview {
    let m = Member(
        id: "SeánÓBriain", uri: "https://data.oireachtas.ie/ie/oireachtas/member/id/SeánÓBriain",
        memberCode: "SeánÓBriain", fullName: "Séan Ó Briain",
        firstName: "Séan", lastName: "Ó Briain",
        party: "Fianna Fáil", constituency: "Dublin Bay North", constituencyCode: "DBN",
        photoUrl: "", offices: ["Minister for Finance"], committees: []
    )
    return NavigationStack {
        MemberProfileView(member: m)
    }
}
