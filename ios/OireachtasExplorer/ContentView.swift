import SwiftUI

@MainActor
final class AppSessionModel: ObservableObject {
    @Published var chamber: Chamber = .dail {
        didSet {
            if oldValue != chamber {
                selectedHouseNo = chamber.latestHouseNo
            }
        }
    }
    @Published var selectedHouseNo: Int = Chamber.dail.latestHouseNo

    var selectedHouse: HouseInfo {
        houseList(for: chamber).first { $0.houseNo == selectedHouseNo }
            ?? HouseInfo(houseNo: chamber.latestHouseNo, year: 0)
    }

    var chamberId: String {
        houseUri(chamber: chamber, houseNo: selectedHouseNo)
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case home
    case search
    case members
    case debates
    case legislation
    case saved

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: return "Home"
        case .search: return "Search"
        case .members: return "Members"
        case .debates: return "Debates"
        case .legislation: return "Bills"
        case .saved: return "Saved"
        }
    }

    var systemImage: String {
        switch self {
        case .home: return "house.fill"
        case .search: return "magnifyingglass"
        case .members: return "person.2.fill"
        case .debates: return "bubble.left.and.bubble.right.fill"
        case .legislation: return "doc.text.fill"
        case .saved: return "bookmark.fill"
        }
    }
}

struct ContentView: View {
    @StateObject private var session = AppSessionModel()
    @State private var selectedTab: AppTab = .home
    @State private var path: [AppRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            TabView(selection: $selectedTab) {
                ForEach(AppTab.allCases) { tab in
                    tabContent(tab)
                        .tag(tab)
                        .tabItem {
                            Label(tab.title, systemImage: tab.systemImage)
                        }
                }
            }
            .tint(Color.darkGreen)
            .background(Color.cream)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Text("Oireachtas Explorer")
                        .font(.dmSerif(size: 18))
                        .foregroundColor(Color.headingText)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Compare Members") { path.append(.compareMembers) }
                        Button("About") { path.append(.about) }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .foregroundColor(Color.darkGreen)
                    }
                }
            }
            .navigationDestination(for: AppRoute.self, destination: routeDestination)
        }
        .environmentObject(session)
    }

    @ViewBuilder
    private func tabContent(_ tab: AppTab) -> some View {
        switch tab {
        case .home:
            HomeView()
        case .search:
            GlobalSearchScaffold(navigate: { path.append($0) })
        case .members:
            MembersView()
        case .debates:
            DebatesView()
        case .legislation:
            LegislationListScreen(navigate: { path.append($0) })
        case .saved:
            SavedItemsMigrationScreen(navigate: { path.append($0) })
        }
    }

    @ViewBuilder
    private func routeDestination(_ route: AppRoute) -> some View {
        switch route {
        case .globalSearch(let query):
            GlobalSearchScaffold(initialQuery: query, navigate: { path.append($0) })
        case .globalDebates:
            DebatesView()
        case .globalLegislation:
            LegislationListScreen(navigate: { path.append($0) })
        case .debateViewer(let xmlUri, let debateSectionUri, let title, let focusMemberUri):
            DebateTranscriptView(
                title: title,
                xmlUri: xmlUri,
                debateSectionUri: debateSectionUri,
                focusMemberUri: focusMemberUri
            )
        case .billViewer(let billNo, let billYear):
            ResearchPlaceholderView(
                title: "\(billYear) Bill \(billNo)",
                subtitle: "Bill viewer",
                systemImage: "doc.richtext",
                detail: "This route is reserved for the native bill reader: stage timeline, sponsors, versions, related documents, save, and share."
            )
        case .savedItems:
            SavedItemsMigrationScreen(navigate: { path.append($0) })
        case .publicCollection(let slug):
            ResearchPlaceholderView(
                title: slug,
                subtitle: "Public collection",
                systemImage: "person.2.wave.2.fill",
                detail: "This route will load published research collections from the configured worker."
            )
        case .compareMembers:
            ResearchPlaceholderView(
                title: "Compare Members",
                subtitle: "Research workflow",
                systemImage: "rectangle.split.3x1.fill",
                detail: "This will mirror the web comparison tool with side-by-side activity, votes, questions, and legislation."
            )
        case .partyMembers(let partyName):
            ResearchPlaceholderView(
                title: partyName,
                subtitle: "Party members",
                systemImage: "person.3.fill",
                detail: "This route will show all members for the selected party in the active chamber and session."
            )
        case .constituencyMembers(let code, let name):
            ResearchPlaceholderView(
                title: name,
                subtitle: code,
                systemImage: "map.fill",
                detail: "This route will host the constituency or Seanad panel member grid."
            )
        case .memberProfile(let memberUri, let memberName, _, _):
            if memberName.isEmpty {
                MemberProfileLoaderView(memberUri: memberUri)
            } else {
                ResearchPlaceholderView(
                    title: memberName,
                    subtitle: "Member profile",
                    systemImage: "person.crop.circle.fill",
                    detail: "The native profile route will reuse the current profile data, then add save/share, filters, and vote breakdown parity."
                )
            }
        case .committee(_, let name):
            ResearchPlaceholderView(
                title: name,
                subtitle: "Committee",
                systemImage: "building.2.crop.circle",
                detail: "This route will combine committee membership with committee debate search."
            )
        case .about:
            AboutView()
        }
    }
}

private struct OireachtasHomeScreen: View {
    @EnvironmentObject private var session: AppSessionModel
    let navigate: (AppRoute) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                SessionPicker()
                hero
                quickActions
                parityMap
            }
            .padding(.horizontal, 18)
            .padding(.top, 18)
            .padding(.bottom, 36)
        }
        .background(Color.cream)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("\(session.chamber.title) Éireann · \(session.selectedHouse.label(for: session.chamber))")
                .font(.inter(size: 11, weight: .bold))
                .foregroundColor(Color.darkGreen)
                .textCase(.uppercase)

            Text("Ireland's Parliament, Open to All.")
                .font(.dmSerif(size: 34))
                .foregroundColor(Color.headingText)
                .fixedSize(horizontal: false, vertical: true)

            Text("A native iOS rebuild aligned to the web app: search, members, debates, legislation, saved research, collections, and comparison.")
                .font(.inter(size: 15))
                .foregroundColor(Color.secondaryText)
                .lineSpacing(4)

            Button {
                navigate(.globalSearch(query: nil))
            } label: {
                Label("Search members, debates, bills", systemImage: "magnifyingglass")
                    .font(.inter(size: 15, weight: .semibold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 13)
            }
            .foregroundColor(Color.headingText)
            .glassSurface(cornerRadius: 18, tint: Color.darkGreen.opacity(0.08), interactive: true)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color.white.opacity(0.92), Color(hex: "edf4ee")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 24, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Research Tools")
                .font(.dmSerif(size: 22))
                .foregroundColor(Color.headingText)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                HomeActionCard(title: "Members", subtitle: session.chamber.pluralMemberNoun, systemImage: "person.2.fill") {
                    navigate(.constituencyMembers(code: "", name: "All \(session.chamber.pluralMemberNoun)"))
                }
                HomeActionCard(title: "Debates", subtitle: "Official record", systemImage: "text.bubble.fill") {
                    navigate(.globalDebates)
                }
                HomeActionCard(title: "Legislation", subtitle: "Bills and stages", systemImage: "doc.text.fill") {
                    navigate(.globalLegislation)
                }
                HomeActionCard(title: "Compare", subtitle: "Side by side", systemImage: "rectangle.split.3x1.fill") {
                    navigate(.compareMembers)
                }
            }
        }
    }

    private var parityMap: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Migration Map")
                .font(.dmSerif(size: 22))
                .foregroundColor(Color.headingText)

            ForEach(MigrationMilestone.allCases) { milestone in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: milestone.systemImage)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color.darkGreen)
                        .frame(width: 28, height: 28)
                        .glassSurface(cornerRadius: 14, tint: Color.darkGreen.opacity(0.08))

                    VStack(alignment: .leading, spacing: 3) {
                        Text(milestone.title)
                            .font(.inter(size: 14, weight: .semibold))
                            .foregroundColor(Color.headingText)
                        Text(milestone.detail)
                            .font(.inter(size: 12))
                            .foregroundColor(Color.secondaryText)
                            .lineSpacing(3)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.cardBorder, lineWidth: 1)
                )
            }
        }
    }
}

private struct SessionPicker: View {
    @EnvironmentObject private var session: AppSessionModel

    var body: some View {
        VStack(spacing: 10) {
            Picker("Chamber", selection: $session.chamber) {
                ForEach(Chamber.allCases) { chamber in
                    Text(chamber.title).tag(chamber)
                }
            }
            .pickerStyle(.segmented)

            Picker("Session", selection: $session.selectedHouseNo) {
                ForEach(houseList(for: session.chamber)) { house in
                    Text(house.fullLabel(for: session.chamber)).tag(house.houseNo)
                }
            }
            .font(.inter(size: 13))
        }
        .padding(12)
        .glassSurface(cornerRadius: 18, tint: Color.darkGreen.opacity(0.06), interactive: true)
    }
}

private struct HomeActionCard: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: systemImage)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(Color.darkGreen)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.inter(size: 15, weight: .bold))
                        .foregroundColor(Color.headingText)
                    Text(subtitle)
                        .font(.inter(size: 11))
                        .foregroundColor(Color.secondaryText)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 94, alignment: .topLeading)
            .padding(14)
        }
        .buttonStyle(.plain)
        .glassSurface(cornerRadius: 18, tint: Color.darkGreen.opacity(0.05), interactive: true)
    }
}

@MainActor
private final class GlobalSearchModel: ObservableObject {
    @Published var members: [Member] = []
    @Published var debates: [Debate] = []
    @Published var bills: [Bill] = []
    @Published var isLoading = false
    @Published var error: String?

    func search(query: String, chamber: Chamber, houseNo: Int) async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            members = []
            debates = []
            bills = []
            return
        }

        isLoading = true
        error = nil
        do {
            async let loadedMembers = OireachtasAPI.shared.getMembers(chamber: chamber, houseNo: houseNo)
            async let loadedDebates = OireachtasAPI.shared.getDebates(
                chamberId: houseUri(chamber: chamber, houseNo: houseNo),
                limit: 60
            )
            async let loadedBills = OireachtasAPI.shared.getLegislation(
                chamberId: houseUri(chamber: chamber, houseNo: houseNo),
                limit: 60
            )

            let needle = trimmed.lowercased()
            let (allMembers, debateResult, allBills) = try await (loadedMembers, loadedDebates, loadedBills)
            members = allMembers.filter {
                $0.fullName.lowercased().contains(needle)
                    || $0.party.lowercased().contains(needle)
                    || $0.constituency.lowercased().contains(needle)
            }
            debates = debateResult.debates.filter {
                $0.title.lowercased().contains(needle)
            }
            bills = allBills.filter {
                $0.title.lowercased().contains(needle)
                    || ($0.longTitle?.lowercased().contains(needle) ?? false)
                    || $0.sponsors.joined(separator: " ").lowercased().contains(needle)
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

private struct GlobalSearchScaffold: View {
    @EnvironmentObject private var session: AppSessionModel
    @StateObject private var model = GlobalSearchModel()
    @State private var query: String
    let navigate: (AppRoute) -> Void

    init(initialQuery: String? = nil, navigate: @escaping (AppRoute) -> Void) {
        _query = State(initialValue: initialQuery ?? "")
        self.navigate = navigate
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            SessionPicker()

            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Color.mutedText)
                TextField("Search members, debates, bills...", text: $query)
                    .font(.inter(size: 16))
                    .submitLabel(.search)
                    .onSubmit {
                        navigate(.globalSearch(query: query.isEmpty ? nil : query))
                    }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .glassSurface(cornerRadius: 18, tint: Color.darkGreen.opacity(0.05), interactive: true)

            searchResults
        }
        .padding(18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.cream)
        .task(id: "\(session.chamber.rawValue)-\(session.selectedHouseNo)-\(query)") {
            guard query.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2 else { return }
            try? await Task.sleep(nanoseconds: 250_000_000)
            if !Task.isCancelled {
                await model.search(query: query, chamber: session.chamber, houseNo: session.selectedHouseNo)
            }
        }
    }

    @ViewBuilder
    private var searchResults: some View {
        if query.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 {
            ResearchPlaceholderView(
                title: "Global Search",
                subtitle: session.selectedHouse.label(for: session.chamber),
                systemImage: "magnifyingglass.circle.fill",
                detail: "Type at least two characters to search members, recent debates, and current legislation."
            )
        } else if model.isLoading {
            LoadingView()
        } else if let error = model.error {
            ErrorBanner(message: error)
        } else {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    SearchSection(title: "Members", count: model.members.count) {
                        ForEach(model.members.prefix(12)) { member in
                            Button {
                                navigate(.memberProfile(
                                    memberUri: member.uri,
                                    memberName: "",
                                    constituencyCode: member.constituencyCode,
                                    constituencyName: member.constituency
                                ))
                            } label: {
                                HStack(spacing: 12) {
                                    AvatarView(member: member, size: 42)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(member.fullName)
                                            .font(.inter(size: 14, weight: .semibold))
                                            .foregroundColor(Color.headingText)
                                        Text("\(member.party) · \(member.constituency)")
                                            .font(.inter(size: 12))
                                            .foregroundColor(Color.secondaryText)
                                    }
                                    Spacer()
                                }
                                .padding(12)
                                .cardStyle()
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    SearchSection(title: "Debates", count: model.debates.count) {
                        ForEach(model.debates.prefix(12)) { debate in
                            if let xmlUri = debate.rawXmlUri, let sectionUri = debate.debateSectionUri {
                                Button {
                                    navigate(.debateViewer(xmlUri: xmlUri, debateSectionUri: sectionUri, title: debate.title, focusMemberUri: nil))
                                } label: {
                                    DebateItemRow(title: debate.title, date: debate.formattedDate, typeLabel: debate.debateType)
                                }
                                .buttonStyle(.plain)
                            } else {
                                DebateItemRow(title: debate.title, date: debate.formattedDate, typeLabel: debate.debateType)
                            }
                        }
                    }

                    SearchSection(title: "Bills", count: model.bills.count) {
                        ForEach(model.bills.prefix(12)) { bill in
                            BillSummaryRow(bill: bill) {
                                navigate(.billViewer(billNo: bill.billNo, billYear: bill.billYear))
                            }
                        }
                    }
                }
                .padding(.bottom, 24)
            }
        }
    }
}

private struct MembersMigrationScreen: View {
    @EnvironmentObject private var session: AppSessionModel
    let navigate: (AppRoute) -> Void

    var body: some View {
        ResearchPlaceholderView(
            title: session.chamber.pluralMemberNoun,
            subtitle: session.selectedHouse.label(for: session.chamber),
            systemImage: "person.2.fill",
            detail: "This screen will replace the legacy constituency browser with a chamber-aware member directory, constituency/panel picker, party filters, committee links, and native profile routing."
        )
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Search") { navigate(.globalSearch(query: nil)) }
            }
        }
    }
}

private struct DebatesMigrationScreen: View {
    @EnvironmentObject private var session: AppSessionModel
    let navigate: (AppRoute) -> Void

    var body: some View {
        ResearchPlaceholderView(
            title: "\(session.chamber.title) Debates",
            subtitle: session.selectedHouse.label(for: session.chamber),
            systemImage: "bubble.left.and.bubble.right.fill",
            detail: "This screen will port the web global debates list, house/committee scope, date filtering, transcript navigation, and member-focused highlighting."
        )
    }
}

private struct LegislationMigrationScreen: View {
    @EnvironmentObject private var session: AppSessionModel
    let navigate: (AppRoute) -> Void

    var body: some View {
        ResearchPlaceholderView(
            title: "\(session.chamber.title) Legislation",
            subtitle: session.selectedHouse.label(for: session.chamber),
            systemImage: "doc.text.fill",
            detail: "This screen will port global legislation, bill details, stage progress, sponsors, document versions, save, and share actions."
        )
    }
}

@MainActor
private final class LegislationListModel: ObservableObject {
    @Published var bills: [Bill] = []
    @Published var isLoading = false
    @Published var error: String?

    func load(chamber: Chamber, houseNo: Int) async {
        isLoading = true
        error = nil
        do {
            bills = try await OireachtasAPI.shared.getLegislation(
                chamberId: houseUri(chamber: chamber, houseNo: houseNo),
                limit: 100
            )
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

private struct LegislationListScreen: View {
    @EnvironmentObject private var session: AppSessionModel
    @StateObject private var model = LegislationListModel()
    let navigate: (AppRoute) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SessionPicker()

            VStack(alignment: .leading, spacing: 4) {
                Text("\(session.chamber.title) Legislation")
                    .font(.dmSerif(size: 28))
                    .foregroundColor(Color.headingText)
                Text("Bills and stages for \(session.selectedHouse.label(for: session.chamber))")
                    .font(.inter(size: 13))
                    .foregroundColor(Color.secondaryText)
            }

            if model.isLoading {
                LoadingView()
                Spacer()
            } else if let error = model.error {
                ErrorBanner(message: error)
                Spacer()
            } else if model.bills.isEmpty {
                ResearchPlaceholderView(
                    title: "No bills found",
                    subtitle: session.selectedHouse.label(for: session.chamber),
                    systemImage: "doc.text.magnifyingglass",
                    detail: "The API did not return legislation for this chamber/session."
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(model.bills) { bill in
                            BillSummaryRow(bill: bill) {
                                navigate(.billViewer(billNo: bill.billNo, billYear: bill.billYear))
                            }
                        }
                    }
                    .padding(.bottom, 24)
                }
            }
        }
        .padding(18)
        .background(Color.cream)
        .task(id: "\(session.chamber.rawValue)-\(session.selectedHouseNo)") {
            await model.load(chamber: session.chamber, houseNo: session.selectedHouseNo)
        }
        .refreshable {
            await model.load(chamber: session.chamber, houseNo: session.selectedHouseNo)
        }
    }
}

private struct SearchSection<Content: View>: View {
    let title: String
    let count: Int
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(title)
                    .font(.dmSerif(size: 20))
                    .foregroundColor(Color.headingText)
                Spacer()
                Text("\(count)")
                    .font(.inter(size: 12, weight: .bold))
                    .foregroundColor(Color.darkGreen)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .glassSurface(cornerRadius: 12, tint: Color.darkGreen.opacity(0.08))
            }

            if count == 0 {
                Text("No matches")
                    .font(.inter(size: 13))
                    .foregroundColor(Color.mutedText)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .cardStyle()
            } else {
                content()
            }
        }
    }
}

private struct BillSummaryRow: View {
    let bill: Bill
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Text(bill.status.isEmpty ? "Bill" : bill.status)
                        .font(.inter(size: 10, weight: .bold))
                        .foregroundColor(bill.isEnacted ? Color.darkGreen : Color(hex: "1e3a7a"))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(bill.isEnacted ? Color(hex: "d8f0dd") : Color(hex: "e8eef8"))
                        .clipShape(Capsule())
                    Text("\(bill.billNo)/\(bill.billYear)")
                        .font(.inter(size: 11, weight: .semibold))
                        .foregroundColor(Color.mutedText)
                    Spacer()
                }

                Text(bill.title)
                    .font(.dmSerif(size: 17))
                    .foregroundColor(Color.headingText)
                    .fixedSize(horizontal: false, vertical: true)

                if let longTitle = bill.longTitle, !longTitle.isEmpty {
                    Text(longTitle)
                        .font(.inter(size: 12))
                        .foregroundColor(Color.secondaryText)
                        .lineLimit(3)
                        .lineSpacing(3)
                }

                if !bill.sponsors.isEmpty {
                    Text("Sponsors: \(bill.sponsors.prefix(3).joined(separator: ", "))")
                        .font(.inter(size: 11))
                        .foregroundColor(Color.mutedText)
                        .lineLimit(2)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .cardStyle()
        }
        .buttonStyle(.plain)
    }
}

private struct SavedItemsMigrationScreen: View {
    let navigate: (AppRoute) -> Void

    var body: some View {
        ResearchPlaceholderView(
            title: "Saved Research",
            subtitle: "Local library",
            systemImage: "bookmark.fill",
            detail: "This screen will add Codable local persistence for saved members, bills, debates, speeches, questions, citations, and public collection publishing."
        )
    }
}

private struct ResearchPlaceholderView: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let detail: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Image(systemName: systemImage)
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundColor(Color.darkGreen)
                    .frame(width: 58, height: 58)
                    .glassSurface(cornerRadius: 22, tint: Color.darkGreen.opacity(0.08))

                VStack(alignment: .leading, spacing: 4) {
                    Text(subtitle.uppercased())
                        .font(.inter(size: 11, weight: .bold))
                        .foregroundColor(Color.mutedText)
                    Text(title)
                        .font(.dmSerif(size: 30))
                        .foregroundColor(Color.headingText)
                }

                Text(detail)
                    .font(.inter(size: 15))
                    .foregroundColor(Color.secondaryText)
                    .lineSpacing(4)

                Text("Foundation status: route exists, session context is wired, and the surface is ready for feature implementation.")
                    .font(.inter(size: 13, weight: .semibold))
                    .foregroundColor(Color.darkGreen)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(hex: "edf6ef"), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color.cream)
    }
}

private enum MigrationMilestone: CaseIterable, Identifiable {
    case navigation
    case dataParity
    case researchScreens
    case persistence
    case liquidGlass

    var id: String { title }

    var title: String {
        switch self {
        case .navigation: return "Native route map"
        case .dataParity: return "Chamber-aware data services"
        case .researchScreens: return "Web-parity screens"
        case .persistence: return "Saved research and sharing"
        case .liquidGlass: return "Liquid Glass UI system"
        }
    }

    var detail: String {
        switch self {
        case .navigation: return "Tabs and routes now mirror the web app's product surface."
        case .dataParity: return "Next: align API methods, models, and date ranges with the web app."
        case .researchScreens: return "Each placeholder becomes a native SwiftUI workflow."
        case .persistence: return "Saved items, transcripts, and collections move into local Codable storage."
        case .liquidGlass: return "Shared modifiers provide iOS 26 glass with material fallbacks."
        }
    }

    var systemImage: String {
        switch self {
        case .navigation: return "point.topleft.down.curvedto.point.bottomright.up"
        case .dataParity: return "arrow.triangle.2.circlepath"
        case .researchScreens: return "rectangle.stack.fill"
        case .persistence: return "externaldrive.fill"
        case .liquidGlass: return "sparkles"
        }
    }
}

#Preview {
    ContentView()
}
