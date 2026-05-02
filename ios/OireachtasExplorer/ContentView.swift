import SwiftUI
import UIKit

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
            SavedItemsScreen(navigate: { path.append($0) })
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
            BillViewerScreen(billNo: billNo, billYear: billYear)
        case .savedItems:
            SavedItemsScreen(navigate: { path.append($0) })
        case .publicCollection(let slug):
            PublicCollectionScreen(slug: slug, navigate: { path.append($0) })
        case .compareMembers:
            CompareMembersScreen(navigate: { path.append($0) })
        case .partyMembers(let partyName):
            MemberRouteGridScreen(mode: .party(partyName))
        case .constituencyMembers(let code, let name):
            MemberRouteGridScreen(mode: .constituency(code: code, name: name))
        case .memberProfile(let memberUri, _, _, _):
            MemberProfileLoaderView(memberUri: memberUri)
        case .committee(let uri, let name):
            CommitteeRouteScreen(committeeUri: uri, committeeName: name)
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

enum MemberRouteGridMode: Hashable {
    case party(String)
    case constituency(code: String, name: String)

    var title: String {
        switch self {
        case .party(let partyName):
            return partyName
        case .constituency(_, let name):
            return name
        }
    }

    func subtitle(chamber: Chamber, house: HouseInfo, count: Int) -> String {
        let noun = count == 1 ? chamber.memberNoun : chamber.pluralMemberNoun
        return "\(count) \(noun) · \(house.label(for: chamber))"
    }
}

@MainActor
private final class MemberRouteGridModel: ObservableObject {
    @Published var members: [Member] = []
    @Published var isLoading = false
    @Published var error: String?

    func load(mode: MemberRouteGridMode, chamber: Chamber, houseNo: Int) async {
        isLoading = true
        error = nil
        do {
            switch mode {
            case .party(let partyName):
                let loaded = try await OireachtasAPI.shared.getMembers(chamber: chamber, houseNo: houseNo)
                members = loaded
                    .filter { $0.party == partyName }
                    .sorted(by: memberSort)
            case .constituency(let code, _):
                members = try await OireachtasAPI.shared.getMembers(
                    chamber: chamber,
                    houseNo: houseNo,
                    constCode: code
                )
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func memberSort(_ lhs: Member, _ rhs: Member) -> Bool {
        let leftLast = lhs.lastName ?? lhs.fullName
        let rightLast = rhs.lastName ?? rhs.fullName
        if leftLast != rightLast { return leftLast < rightLast }
        return lhs.fullName < rhs.fullName
    }
}

struct MemberRouteGridScreen: View {
    @EnvironmentObject private var session: AppSessionModel
    @Environment(\.dismiss) private var dismiss
    @StateObject private var model = MemberRouteGridModel()
    let mode: MemberRouteGridMode

    var body: some View {
        VStack(spacing: 0) {
            RouteHeader(
                title: mode.title,
                subtitle: model.isLoading ? session.selectedHouse.label(for: session.chamber) : mode.subtitle(
                    chamber: session.chamber,
                    house: session.selectedHouse,
                    count: model.members.count
                ),
                onBack: { dismiss() }
            )

            if model.isLoading {
                Spacer()
                LoadingView()
                Spacer()
            } else if let error = model.error {
                Spacer()
                ErrorBanner(message: error)
                Spacer()
            } else if model.members.isEmpty {
                Spacer()
                EmptyRouteState(
                    systemImage: "person.2.slash",
                    message: "No \(session.chamber.pluralMemberNoun) found for this route in \(session.selectedHouse.label(for: session.chamber))."
                )
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(
                        columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                        spacing: 10
                    ) {
                        ForEach(model.members) { member in
                            NavigationLink(destination: MemberProfileLoaderView(memberUri: member.uri)) {
                                MemberCardView(member: member)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(Color.cream)
        .navigationBarHidden(true)
        .task(id: "\(session.chamber.rawValue)-\(session.selectedHouseNo)-\(mode)") {
            await model.load(mode: mode, chamber: session.chamber, houseNo: session.selectedHouseNo)
        }
    }
}

struct CommitteeRouteMember: Identifiable {
    let id: String
    let member: Member
    let chamber: Chamber
    let houseNo: Int
    let role: String
}

@MainActor
private final class CommitteeRouteModel: ObservableObject {
    @Published var members: [CommitteeRouteMember] = []
    @Published var isLoading = false
    @Published var error: String?

    private let roleOrder = [
        "Cathaoirleach": 0,
        "Leas-Cathaoirleach": 1,
        "Chair": 0,
        "Vice-Chair": 1
    ]

    func load(committeeUri: String, committeeName: String, chamber: Chamber, houseNo: Int) async {
        isLoading = true
        error = nil
        do {
            async let currentMembers = OireachtasAPI.shared.getMembers(chamber: chamber, houseNo: houseNo)
            if let paired = pairedHouse(chamber: chamber, houseNo: houseNo) {
                async let pairedMembers = OireachtasAPI.shared.getMembers(chamber: paired.chamber, houseNo: paired.houseNo)
                let (current, pairedLoaded) = try await (currentMembers, pairedMembers)
                members = buildRows(
                    groups: [
                        (members: current, chamber: chamber, houseNo: houseNo),
                        (members: pairedLoaded, chamber: paired.chamber, houseNo: paired.houseNo)
                    ],
                    committeeUri: committeeUri,
                    committeeName: committeeName
                )
            } else {
                let current = try await currentMembers
                members = buildRows(
                    groups: [(members: current, chamber: chamber, houseNo: houseNo)],
                    committeeUri: committeeUri,
                    committeeName: committeeName
                )
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func buildRows(
        groups: [(members: [Member], chamber: Chamber, houseNo: Int)],
        committeeUri: String,
        committeeName: String
    ) -> [CommitteeRouteMember] {
        var seen = Set<String>()
        let targetName = normalizeCommitteeName(committeeName)
        var rows: [CommitteeRouteMember] = []

        for group in groups {
            for member in group.members where !seen.contains(member.uri) {
                guard let membership = member.committees.first(where: {
                    $0.uri == committeeUri || normalizeCommitteeName($0.name) == targetName
                }) else { continue }

                seen.insert(member.uri)
                rows.append(
                    CommitteeRouteMember(
                        id: member.uri,
                        member: member,
                        chamber: group.chamber,
                        houseNo: group.houseNo,
                        role: membership.role
                    )
                )
            }
        }

        return rows.sorted { lhs, rhs in
            let leftRole = roleOrder[lhs.role] ?? 99
            let rightRole = roleOrder[rhs.role] ?? 99
            if leftRole != rightRole { return leftRole < rightRole }
            if lhs.chamber != rhs.chamber { return lhs.chamber == .dail }
            let leftLast = lhs.member.lastName ?? lhs.member.fullName
            let rightLast = rhs.member.lastName ?? rhs.member.fullName
            if leftLast != rightLast { return leftLast < rightLast }
            return lhs.member.fullName < rhs.member.fullName
        }
    }

    private func normalizeCommitteeName(_ value: String) -> String {
        value
            .lowercased()
            .replacingOccurrences(of: "joint committee on ", with: "")
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }
}

struct CommitteeRouteScreen: View {
    @EnvironmentObject private var session: AppSessionModel
    @Environment(\.dismiss) private var dismiss
    @StateObject private var model = CommitteeRouteModel()
    let committeeUri: String
    let committeeName: String

    var body: some View {
        VStack(spacing: 0) {
            RouteHeader(
                title: committeeName,
                subtitle: model.isLoading ? session.selectedHouse.label(for: session.chamber) : committeeSubtitle,
                onBack: { dismiss() }
            )

            if model.isLoading {
                Spacer()
                LoadingView()
                Spacer()
            } else if let error = model.error {
                Spacer()
                ErrorBanner(message: error)
                Spacer()
            } else if model.members.isEmpty {
                Spacer()
                EmptyRouteState(systemImage: "building.2.crop.circle", message: "No current members found for this committee.")
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(model.members) { row in
                            NavigationLink(destination: MemberProfileLoaderView(memberUri: row.member.uri)) {
                                CommitteeMemberRow(row: row)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(16)
                }
            }
        }
        .background(Color.cream)
        .navigationBarHidden(true)
        .task(id: "\(session.chamber.rawValue)-\(session.selectedHouseNo)-\(committeeUri)-\(committeeName)") {
            await model.load(
                committeeUri: committeeUri,
                committeeName: committeeName,
                chamber: session.chamber,
                houseNo: session.selectedHouseNo
            )
        }
    }

    private var committeeSubtitle: String {
        let dailCount = model.members.filter { $0.chamber == .dail }.count
        let seanadCount = model.members.filter { $0.chamber == .seanad }.count
        let parts = [
            dailCount > 0 ? "\(dailCount) \(dailCount == 1 ? Chamber.dail.memberNoun : Chamber.dail.pluralMemberNoun)" : "",
            seanadCount > 0 ? "\(seanadCount) \(seanadCount == 1 ? Chamber.seanad.memberNoun : Chamber.seanad.pluralMemberNoun)" : ""
        ].filter { !$0.isEmpty }
        return parts.isEmpty ? session.selectedHouse.label(for: session.chamber) : parts.joined(separator: " · ")
    }
}

private struct CommitteeMemberRow: View {
    let row: CommitteeRouteMember

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(member: row.member, size: 48)

            VStack(alignment: .leading, spacing: 6) {
                Text(displayName)
                    .font(.inter(size: 15, weight: .semibold))
                    .foregroundColor(Color.headingText)
                    .lineLimit(2)

                HStack(spacing: 6) {
                    PartyBadge(party: row.member.party, small: true)
                    Text(row.member.constituency)
                        .font(.inter(size: 11))
                        .foregroundColor(Color.secondaryText)
                        .lineLimit(1)
                }

                Text(row.chamber.title)
                    .font(.inter(size: 10, weight: .bold))
                    .foregroundColor(Color.mutedText)
                    .textCase(.uppercase)
            }

            Spacer()

            Text(row.role)
                .font(.inter(size: 10, weight: .bold))
                .foregroundColor(Color.darkGreen)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.voteTaBg)
                .clipShape(Capsule())
        }
        .padding(12)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
    }

    private var displayName: String {
        switch row.chamber {
        case .dail:
            return row.member.fullName.contains("T.D.") ? row.member.fullName : "\(row.member.fullName) T.D."
        case .seanad:
            return row.member.fullName.hasPrefix("Senator ") ? row.member.fullName : "Senator \(row.member.fullName)"
        }
    }
}

private struct RouteHeader: View {
    let title: String
    let subtitle: String
    let onBack: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.dmSerif(size: 18))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text(subtitle)
                    .font(.inter(size: 11))
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(1)
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.forestGreen)
    }
}

private struct EmptyRouteState: View {
    let systemImage: String
    let message: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.system(size: 34, weight: .semibold))
                .foregroundColor(Color.mutedText)
            Text(message)
                .font(.inter(size: 14))
                .foregroundColor(Color.mutedText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
        }
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
private final class BillViewerModel: ObservableObject {
    @Published var bill: Bill?
    @Published var isLoading = false
    @Published var error: String?

    func load(billNo: String, billYear: String) async {
        isLoading = true
        error = nil
        do {
            bill = try await OireachtasAPI.shared.getBill(billNo: billNo, billYear: billYear)
            if bill == nil {
                error = "Bill not found."
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

private struct BillViewerScreen: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var session: AppSessionModel
    @StateObject private var model = BillViewerModel()
    let billNo: String
    let billYear: String

    var body: some View {
        VStack(spacing: 0) {
            RouteHeader(
                title: "Bill \(billNo)/\(billYear)",
                subtitle: model.bill?.statusLabel ?? "Legislation record",
                onBack: { dismiss() }
            )

            if model.isLoading {
                Spacer()
                LoadingView()
                Spacer()
            } else if let error = model.error, model.bill == nil {
                Spacer()
                ErrorBanner(message: "Failed to load bill: \(error)")
                Spacer()
            } else if let bill = model.bill {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        BillHeroCard(
                            bill: bill,
                            savedItem: bill.savedItem(chamber: session.chamber, houseNo: session.selectedHouseNo),
                            openDocument: openDocument
                        )
                        BillTimelineCard(stages: bill.stages)
                        BillDocumentSection(
                            title: "Versions",
                            emptyMessage: "No versions found.",
                            documents: bill.versions,
                            openDocument: openDocument
                        )
                        BillDocumentSection(
                            title: "Related Documents",
                            emptyMessage: "No related documents.",
                            documents: bill.relatedDocs,
                            openDocument: openDocument
                        )
                    }
                    .padding(16)
                    .padding(.bottom, 18)
                }
            }
        }
        .background(Color.cream)
        .navigationBarHidden(true)
        .task(id: "\(billNo)-\(billYear)") {
            await model.load(billNo: billNo, billYear: billYear)
        }
    }

    private func openDocument(_ urlString: String?) {
        guard let urlString, let url = URL(string: urlString) else { return }
        openURL(url)
    }
}

private struct BillHeroCard: View {
    let bill: Bill
    let savedItem: SavedResearchItem
    let openDocument: (String?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        BillStatusBadge(bill: bill)
                        Text("\(bill.billNo)/\(bill.billYear)")
                            .font(.inter(size: 11, weight: .semibold))
                            .foregroundColor(Color.mutedText)
                    }

                    Text(bill.title)
                        .font(.dmSerif(size: 25))
                        .foregroundColor(Color.headingText)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()

                HStack(spacing: 8) {
                    SaveResearchButton(item: savedItem)

                    if bill.pdfUri != nil {
                        Button {
                            openDocument(bill.pdfUri)
                        } label: {
                            Image(systemName: "arrow.up.right.square")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(Color.darkGreen)
                                .frame(width: 34, height: 34)
                                .background(Color.voteTaBg)
                                .clipShape(Circle())
                        }
                        .accessibilityLabel("Open bill PDF")
                        .buttonStyle(.plain)
                    }
                }
            }

            if let longTitle = bill.longTitle, !longTitle.isEmpty {
                Text(longTitle)
                    .font(.inter(size: 14))
                    .foregroundColor(Color.secondaryText)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(12)
                    .background(Color.cream.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            if !bill.sponsors.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Sponsors")
                        .font(.inter(size: 13, weight: .bold))
                        .foregroundColor(Color.headingText)

                    FlowLayout(spacing: 8, rowSpacing: 8) {
                        ForEach(bill.sponsors, id: \.self) { sponsor in
                            Text(sponsor)
                                .font(.inter(size: 12, weight: .semibold))
                                .foregroundColor(Color.darkGreen)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.voteTaBg)
                                .clipShape(Capsule())
                        }
                    }
                }
            }

            VStack(spacing: 0) {
                BillDetailRow(label: "Source", value: bill.source.isEmpty ? "Bill" : bill.source)
                BillDetailRow(label: "Origin House", value: bill.originHouse)
                BillDetailRow(label: "Current Stage", value: bill.currentStage)
                if let updated = bill.lastUpdated, !updated.isEmpty {
                    BillDetailRow(label: "Last Updated", value: formatRawDate(updated), showDivider: false)
                }
            }
            .padding(.top, 2)
        }
        .padding(16)
        .cardStyle()
    }
}

private struct BillStatusBadge: View {
    let bill: Bill

    var body: some View {
        Text(bill.statusLabel)
            .font(.inter(size: 10, weight: .bold))
            .foregroundColor(bill.statusColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(bill.statusBackground)
            .clipShape(Capsule())
    }
}

private struct BillDetailRow: View {
    let label: String
    let value: String
    var showDivider = true

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(label)
                    .font(.inter(size: 12))
                    .foregroundColor(Color.secondaryText)
                Spacer(minLength: 12)
                Text(value.isEmpty ? "—" : value)
                    .font(.inter(size: 12, weight: .semibold))
                    .foregroundColor(label == "Current Stage" ? Color.darkGreen : Color.headingText)
                    .multilineTextAlignment(.trailing)
                    .lineLimit(2)
            }
            .padding(.vertical, 9)

            if showDivider {
                Divider()
                    .background(Color.cardBorder)
            }
        }
    }
}

private struct BillTimelineCard: View {
    let stages: [BillStage]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Timeline")
                .font(.dmSerif(size: 20))
                .foregroundColor(Color.headingText)

            if stages.isEmpty {
                Text("No stage timeline found.")
                    .font(.inter(size: 13))
                    .foregroundColor(Color.mutedText)
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(stages) { stage in
                        BillTimelineRow(stage: stage)
                    }
                }
            }
        }
        .padding(16)
        .cardStyle()
    }
}

private struct BillTimelineRow: View {
    let stage: BillStage

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 0) {
                Circle()
                    .fill(stage.isCurrent ? Color.gold : (stage.isDone ? Color.darkGreen : Color.cardBorder))
                    .frame(width: 11, height: 11)
                Rectangle()
                    .fill(Color.cardBorder)
                    .frame(width: 1, height: 44)
            }
            .padding(.top, 4)

            VStack(alignment: .leading, spacing: 4) {
                Text(stage.name)
                    .font(.inter(size: 13, weight: .semibold))
                    .foregroundColor(Color.headingText)
                    .fixedSize(horizontal: false, vertical: true)

                let metadata = [stage.house, stage.outcome ?? "", stage.date.map(formatRawDate) ?? ""].filter { !$0.isEmpty }
                if !metadata.isEmpty {
                    Text(metadata.joined(separator: " · "))
                        .font(.inter(size: 11))
                        .foregroundColor(Color.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.bottom, 14)
        }
    }
}

private struct BillDocumentSection: View {
    let title: String
    let emptyMessage: String
    let documents: [BillDocument]
    let openDocument: (String?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.dmSerif(size: 20))
                .foregroundColor(Color.headingText)

            if documents.isEmpty {
                Text(emptyMessage)
                    .font(.inter(size: 13))
                    .foregroundColor(Color.mutedText)
            } else {
                VStack(spacing: 10) {
                    ForEach(documents) { document in
                        BillDocumentRow(document: document, openDocument: openDocument)
                    }
                }
            }
        }
        .padding(16)
        .cardStyle()
    }
}

private struct BillDocumentRow: View {
    let document: BillDocument
    let openDocument: (String?) -> Void

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(document.title)
                    .font(.inter(size: 13, weight: .semibold))
                    .foregroundColor(Color.headingText)
                    .fixedSize(horizontal: false, vertical: true)

                if let date = document.date, !date.isEmpty {
                    Text(formatRawDate(date))
                        .font(.inter(size: 11))
                        .foregroundColor(Color.secondaryText)
                }
            }

            Spacer()

            Button {
                openDocument(document.pdfUri ?? document.xmlUri)
            } label: {
                Label(document.pdfUri == nil ? "XML" : "PDF", systemImage: "arrow.up.right")
                    .font(.inter(size: 11, weight: .bold))
                    .foregroundColor(document.pdfUri == nil && document.xmlUri == nil ? Color.mutedText : Color.darkGreen)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color.cream)
                    .clipShape(Capsule())
            }
            .disabled(document.pdfUri == nil && document.xmlUri == nil)
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(Color.cream.opacity(0.65))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

@MainActor
private final class CompareMembersModel: ObservableObject {
    @Published var members: [Member] = []
    @Published var selectedURIs: [String] = []
    @Published var query = ""
    @Published var isLoading = false
    @Published var error: String?

    var selectedMembers: [Member] {
        selectedURIs.compactMap { uri in members.first { $0.uri == uri } }
    }

    var searchResults: [Member] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !term.isEmpty, selectedURIs.count < 3 else { return [] }
        return members
            .filter { !selectedURIs.contains($0.uri) }
            .filter { member in
                member.fullName.lowercased().contains(term)
                    || (member.lastName ?? "").lowercased().contains(term)
                    || (member.firstName ?? "").lowercased().contains(term)
                    || member.party.lowercased().contains(term)
                    || member.constituency.lowercased().contains(term)
            }
            .prefix(12)
            .map { $0 }
    }

    func load(chamber: Chamber, houseNo: Int) async {
        isLoading = true
        error = nil
        do {
            members = try await OireachtasAPI.shared.getMembers(chamber: chamber, houseNo: houseNo)
                .sorted(by: memberSort)
            selectedURIs.removeAll { uri in !members.contains { $0.uri == uri } }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func select(_ member: Member) {
        guard selectedURIs.count < 3, !selectedURIs.contains(member.uri) else { return }
        selectedURIs.append(member.uri)
        query = ""
    }

    func remove(_ member: Member) {
        selectedURIs.removeAll { $0 == member.uri }
    }

    private func memberSort(_ lhs: Member, _ rhs: Member) -> Bool {
        let leftLast = lhs.lastName ?? lhs.fullName
        let rightLast = rhs.lastName ?? rhs.fullName
        if leftLast != rightLast { return leftLast < rightLast }
        return lhs.fullName < rhs.fullName
    }
}

private struct CompareMembersScreen: View {
    @EnvironmentObject private var session: AppSessionModel
    @StateObject private var model = CompareMembersModel()
    let navigate: (AppRoute) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SessionPicker()

            VStack(alignment: .leading, spacing: 4) {
                Text("Compare Members")
                    .font(.dmSerif(size: 28))
                    .foregroundColor(Color.headingText)
                Text("Compare up to three \(session.chamber.pluralMemberNoun.lowercased()) by activity, roles, party, and constituency.")
                    .font(.inter(size: 13))
                    .foregroundColor(Color.secondaryText)
            }

            CompareSearchBox(model: model)

            if model.isLoading {
                LoadingView()
                Spacer()
            } else if let error = model.error {
                ErrorBanner(message: error)
                Spacer()
            } else if model.selectedMembers.isEmpty {
                Spacer()
                EmptyRouteState(
                    systemImage: "rectangle.split.3x1",
                    message: "Select members to compare their parliamentary activity side by side."
                )
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(model.selectedMembers) { member in
                            CompareMemberCard(
                                member: member,
                                chamber: session.chamber,
                                houseNo: session.selectedHouseNo,
                                openProfile: {
                                    navigate(
                                        .memberProfile(
                                            memberUri: member.uri,
                                            memberName: member.fullName,
                                            constituencyCode: member.constituencyCode,
                                            constituencyName: member.constituency
                                        )
                                    )
                                },
                                remove: { model.remove(member) }
                            )
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

private struct CompareSearchBox: View {
    @ObservedObject var model: CompareMembersModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Color.secondaryText)
                TextField(model.selectedURIs.count >= 3 ? "Remove a member to add another" : "Type a name, party, or constituency", text: $model.query)
                    .textInputAutocapitalization(.words)
                    .disableAutocorrection(true)
                    .disabled(model.selectedURIs.count >= 3)
            }
            .padding(12)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))

            if !model.selectedMembers.isEmpty {
                FlowLayout(spacing: 8, rowSpacing: 8) {
                    ForEach(model.selectedMembers) { member in
                        Button {
                            model.remove(member)
                        } label: {
                            Label(member.lastName ?? member.fullName, systemImage: "xmark.circle.fill")
                                .font(.inter(size: 11, weight: .semibold))
                                .foregroundColor(Color.darkGreen)
                                .padding(.horizontal, 9)
                                .padding(.vertical, 6)
                                .background(Color.voteTaBg)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            if !model.searchResults.isEmpty {
                VStack(spacing: 0) {
                    ForEach(model.searchResults) { member in
                        Button {
                            model.select(member)
                        } label: {
                            HStack(spacing: 10) {
                                AvatarView(member: member, size: 34)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(member.fullName)
                                        .font(.inter(size: 13, weight: .semibold))
                                        .foregroundColor(Color.headingText)
                                    Text("\(member.party) · \(member.constituency)")
                                        .font(.inter(size: 11))
                                        .foregroundColor(Color.secondaryText)
                                        .lineLimit(1)
                                }
                                Spacer()
                            }
                            .padding(10)
                        }
                        .buttonStyle(.plain)

                        if member.id != model.searchResults.last?.id {
                            Divider()
                                .background(Color.cardBorder)
                        }
                    }
                }
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
            }
        }
    }
}

@MainActor
private final class CompareMemberCardModel: ObservableObject {
    @Published var counts: (debates: Int, votes: Int, questions: Int, bills: Int)?
    @Published var isLoading = false

    func load(memberUri: String, chamber: Chamber, houseNo: Int) async {
        isLoading = true
        counts = try? await OireachtasAPI.shared.memberCounts(memberUri: memberUri, chamber: chamber, houseNo: houseNo)
        isLoading = false
    }
}

private struct CompareMemberCard: View {
    @StateObject private var model = CompareMemberCardModel()
    let member: Member
    let chamber: Chamber
    let houseNo: Int
    let openProfile: () -> Void
    let remove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle()
                .fill(partyColor(member.party))
                .frame(height: 5)

            HStack(spacing: 12) {
                AvatarView(member: member, size: 58)
                VStack(alignment: .leading, spacing: 4) {
                    Text(member.fullName)
                        .font(.dmSerif(size: 21))
                        .foregroundColor(Color.headingText)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(member.party) · \(member.constituency)")
                        .font(.inter(size: 12))
                        .foregroundColor(Color.secondaryText)
                        .lineLimit(2)
                }
                Spacer()
            }
            .padding(16)

            HStack(spacing: 8) {
                Button("Open Profile", action: openProfile)
                    .font(.inter(size: 12, weight: .bold))
                    .foregroundColor(Color.darkGreen)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.voteTaBg)
                    .clipShape(Capsule())
                    .buttonStyle(.plain)

                Button("Remove", action: remove)
                    .font(.inter(size: 12, weight: .bold))
                    .foregroundColor(Color.voteNilFg)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.voteNilBg)
                    .clipShape(Capsule())
                    .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 14)

            if model.isLoading {
                Text("Loading activity...")
                    .font(.inter(size: 13))
                    .foregroundColor(Color.secondaryText)
                    .padding(16)
            } else if let counts = model.counts {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    CompareMetricTile(label: "Debates", value: counts.debates)
                    CompareMetricTile(label: "Votes", value: counts.votes)
                    CompareMetricTile(label: "Questions", value: counts.questions)
                    CompareMetricTile(label: "Bills", value: counts.bills)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }

            CompareRolesSection(member: member)
                .padding(16)
                .overlay(Rectangle().frame(height: 1).foregroundColor(Color.cardBorder), alignment: .top)
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
        .shadow(color: .black.opacity(0.04), radius: 3, x: 0, y: 1)
        .task(id: "\(member.uri)-\(chamber.rawValue)-\(houseNo)") {
            await model.load(memberUri: member.uri, chamber: chamber, houseNo: houseNo)
        }
    }
}

private struct CompareMetricTile: View {
    let label: String
    let value: Int

    var body: some View {
        VStack(spacing: 3) {
            Text("\(value)")
                .font(.dmSerif(size: 24))
                .foregroundColor(Color.darkGreen)
            Text(label)
                .font(.inter(size: 10, weight: .bold))
                .foregroundColor(Color.mutedText)
                .textCase(.uppercase)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color.cream)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct CompareRolesSection: View {
    let member: Member

    private var roles: [String] {
        Array((member.offices + member.committees.map(\.name)).prefix(8))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Roles")
                .font(.inter(size: 11, weight: .bold))
                .foregroundColor(Color.secondaryText)
                .textCase(.uppercase)

            if roles.isEmpty {
                Text("No current offices or committees listed.")
                    .font(.inter(size: 12))
                    .foregroundColor(Color.mutedText)
            } else {
                FlowLayout(spacing: 6, rowSpacing: 6) {
                    ForEach(roles, id: \.self) { role in
                        Text(role)
                            .font(.inter(size: 11, weight: .semibold))
                            .foregroundColor(Color.bodyText)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(Color.cream)
                            .clipShape(Capsule())
                    }
                }
            }
        }
    }
}

struct SaveResearchButton: View {
    let item: SavedResearchItem
    @State private var isSaved: Bool

    init(item: SavedResearchItem) {
        self.item = item
        _isSaved = State(initialValue: SavedResearchStore.isSaved(id: item.id))
    }

    var body: some View {
        Button {
            isSaved = SavedResearchStore.toggle(item)
        } label: {
            Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(isSaved ? Color.darkGreen : Color.secondaryText)
                .frame(width: 34, height: 34)
                .background(isSaved ? Color.voteTaBg : Color.cream)
                .clipShape(Circle())
        }
        .accessibilityLabel(isSaved ? "Remove \(item.title) from saved items" : "Save \(item.title)")
        .buttonStyle(.plain)
        .onChange(of: item.id) { _ in
            isSaved = SavedResearchStore.isSaved(id: item.id)
        }
    }
}

@MainActor
private final class PublicCollectionModel: ObservableObject {
    @Published var collection: PublicResearchCollection?
    @Published var isLoading = false
    @Published var error: String?
    @Published var isConfigured = true

    func load(slug: String) async {
        isConfigured = await PublicCollectionsAPI.shared.isConfigured
        guard isConfigured else {
            collection = nil
            error = nil
            isLoading = false
            return
        }

        isLoading = true
        error = nil
        collection = nil
        do {
            collection = try await PublicCollectionsAPI.shared.fetchCollection(slug: slug)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

private struct PublicCollectionScreen: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var session: AppSessionModel
    @StateObject private var model = PublicCollectionModel()
    let slug: String
    let navigate: (AppRoute) -> Void

    var body: some View {
        VStack(spacing: 0) {
            RouteHeader(
                title: "Public Collection",
                subtitle: model.collection?.title ?? slug,
                onBack: { dismiss() }
            )

            if !model.isConfigured {
                Spacer()
                EmptyRouteState(
                    systemImage: "icloud.slash",
                    message: "Public collections need a configured Cloudflare Worker URL."
                )
                Spacer()
            } else if model.isLoading {
                Spacer()
                LoadingView()
                Spacer()
            } else if let error = model.error {
                Spacer()
                ErrorBanner(message: "Failed to load collection: \(error)")
                Spacer()
            } else if let collection = model.collection {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        PublicCollectionHero(collection: collection)

                        if collection.items.isEmpty {
                            EmptyRouteState(
                                systemImage: "tray",
                                message: "Nothing to show for this collection yet."
                            )
                            .frame(maxWidth: .infinity)
                            .padding(.top, 24)
                        } else {
                            LazyVStack(spacing: 10) {
                                ForEach(collection.items) { item in
                                    PublicCollectionItemRow(item: item) {
                                        open(item)
                                    }
                                }
                            }
                        }
                    }
                    .padding(16)
                    .padding(.bottom, 18)
                }
            }
        }
        .background(Color.cream)
        .navigationBarHidden(true)
        .task(id: slug) {
            await model.load(slug: slug)
        }
    }

    private func open(_ item: SavedResearchItem) {
        if let parsed = parsePublicCollectionHash(item.urlHash) {
            session.chamber = parsed.chamber
            session.selectedHouseNo = parsed.houseNo
            navigate(parsed.route)
            return
        }

        if let url = URL(string: item.urlHash), url.scheme != nil {
            openURL(url)
        }
    }
}

private struct PublicCollectionHero: View {
    let collection: PublicResearchCollection

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text("Published collection")
                    .font(.inter(size: 10, weight: .bold))
                    .foregroundColor(Color.darkGreen)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.voteTaBg)
                    .clipShape(Capsule())
                Text(formatPublicCollectionDate(collection.createdAt))
                    .font(.inter(size: 11, weight: .semibold))
                    .foregroundColor(Color.mutedText)
                Text("\(collection.itemCount) items")
                    .font(.inter(size: 11, weight: .semibold))
                    .foregroundColor(Color.mutedText)
            }

            Text(collection.title)
                .font(.dmSerif(size: 27))
                .foregroundColor(Color.headingText)
                .fixedSize(horizontal: false, vertical: true)

            if let description = collection.description, !description.isEmpty {
                Text(description)
                    .font(.inter(size: 14))
                    .foregroundColor(Color.secondaryText)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(16)
        .cardStyle()
    }
}

private struct PublicCollectionItemRow: View {
    let item: SavedResearchItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Text(item.type.label)
                        .font(.inter(size: 10, weight: .bold))
                        .foregroundColor(Color.darkGreen)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.voteTaBg)
                        .clipShape(Capsule())
                    Text(formatPublicCollectionDate(item.savedAt))
                        .font(.inter(size: 11, weight: .semibold))
                        .foregroundColor(Color.mutedText)
                    if let sourceDate = item.sourceDate, !sourceDate.isEmpty {
                        Text(formatPublicCollectionDate(sourceDate))
                            .font(.inter(size: 11, weight: .semibold))
                            .foregroundColor(Color.mutedText)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color.mutedText)
                }

                Text(item.title)
                    .font(.dmSerif(size: 18))
                    .foregroundColor(Color.headingText)
                    .fixedSize(horizontal: false, vertical: true)

                if let subtitle = item.subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.inter(size: 12))
                        .foregroundColor(Color.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let citation = item.citation, !citation.isEmpty {
                    Text(citation)
                        .font(.inter(size: 11))
                        .foregroundColor(Color.mutedText)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.cream.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }

                if let quote = item.quote, !quote.isEmpty {
                    Text(quote)
                        .font(.inter(size: 12))
                        .foregroundColor(Color.bodyText)
                        .lineLimit(5)
                        .lineSpacing(3)
                        .padding(.leading, 10)
                        .overlay(alignment: .leading) {
                            Rectangle()
                                .fill(Color.gold)
                                .frame(width: 3)
                        }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .cardStyle()
        }
        .buttonStyle(.plain)
    }
}

private struct ParsedPublicCollectionRoute {
    let chamber: Chamber
    let houseNo: Int
    let route: AppRoute
}

private func formatPublicCollectionDate(_ raw: String) -> String {
    let dateOnly = String(raw.prefix(10))
    return formatRawDate(dateOnly)
}

private func parsePublicCollectionHash(_ hash: String) -> ParsedPublicCollectionRoute? {
    guard hash.hasPrefix("#/") else { return nil }
    let parts = hash
        .dropFirst(2)
        .split(separator: "/", omittingEmptySubsequences: true)
        .map(String.init)

    guard !parts.isEmpty else { return nil }

    var chamber: Chamber = .dail
    var index = 0
    if let parsedChamber = Chamber(rawValue: parts[index]) {
        chamber = parsedChamber
        index += 1
    }

    let latest = chamber.latestHouseNo
    var houseNo = latest
    if index < parts.count, let parsedHouse = Int(parts[index]), parsedHouse >= 1 {
        houseNo = parsedHouse
        index += 1
    }

    guard index < parts.count else {
        return ParsedPublicCollectionRoute(chamber: chamber, houseNo: houseNo, route: .globalSearch(query: nil))
    }

    let rest = Array(parts[index...])
    func decoded(_ offset: Int) -> String {
        guard offset < rest.count else { return "" }
        return rest[offset].removingPercentEncoding ?? rest[offset]
    }

    switch rest.first {
    case "debates":
        return ParsedPublicCollectionRoute(chamber: chamber, houseNo: houseNo, route: .globalDebates)
    case "legislation":
        return ParsedPublicCollectionRoute(chamber: chamber, houseNo: houseNo, route: .globalLegislation)
    case "debate" where rest.count >= 3:
        return ParsedPublicCollectionRoute(
            chamber: chamber,
            houseNo: houseNo,
            route: .debateViewer(
                xmlUri: decoded(1),
                debateSectionUri: decoded(2),
                title: decoded(3).isEmpty ? "Debate Transcript" : decoded(3),
                focusMemberUri: decoded(4).isEmpty ? nil : decoded(4)
            )
        )
    case "bill" where rest.count >= 3:
        return ParsedPublicCollectionRoute(
            chamber: chamber,
            houseNo: houseNo,
            route: .billViewer(billNo: decoded(2), billYear: decoded(1))
        )
    case "search":
        return ParsedPublicCollectionRoute(
            chamber: chamber,
            houseNo: houseNo,
            route: .globalSearch(query: decoded(1).isEmpty ? nil : decoded(1))
        )
    case "saved":
        return ParsedPublicCollectionRoute(chamber: chamber, houseNo: houseNo, route: .savedItems)
    case "collection" where rest.count >= 2:
        return ParsedPublicCollectionRoute(chamber: chamber, houseNo: houseNo, route: .publicCollection(slug: decoded(1)))
    case "compare":
        return ParsedPublicCollectionRoute(chamber: chamber, houseNo: houseNo, route: .compareMembers)
    case "party" where rest.count >= 2:
        return ParsedPublicCollectionRoute(chamber: chamber, houseNo: houseNo, route: .partyMembers(partyName: decoded(1)))
    case "constituency" where rest.count >= 2:
        return ParsedPublicCollectionRoute(
            chamber: chamber,
            houseNo: houseNo,
            route: .constituencyMembers(code: decoded(1), name: decoded(2).isEmpty ? decoded(1) : decoded(2))
        )
    case "member" where rest.count >= 2:
        return ParsedPublicCollectionRoute(
            chamber: chamber,
            houseNo: houseNo,
            route: .memberProfile(
                memberUri: decoded(1),
                memberName: decoded(2),
                constituencyCode: decoded(3),
                constituencyName: decoded(4)
            )
        )
    case "committee" where rest.count >= 2:
        return ParsedPublicCollectionRoute(
            chamber: chamber,
            houseNo: houseNo,
            route: .committee(uri: decoded(1), name: decoded(2))
        )
    default:
        return nil
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    var rowSpacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        let rows = rows(for: subviews, width: width)
        return CGSize(width: width, height: rows.reduce(0) { $0 + $1.height } + CGFloat(max(rows.count - 1, 0)) * rowSpacing)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var origin = bounds.origin
        for row in rows(for: subviews, width: bounds.width) {
            var x = origin.x
            for item in row.items {
                item.subview.place(
                    at: CGPoint(x: x, y: origin.y),
                    proposal: ProposedViewSize(width: item.size.width, height: item.size.height)
                )
                x += item.size.width + spacing
            }
            origin.y += row.height + rowSpacing
        }
    }

    private func rows(for subviews: Subviews, width: CGFloat) -> [FlowRow] {
        var rows: [FlowRow] = []
        var current: [FlowItem] = []
        var currentWidth: CGFloat = 0
        var currentHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            let nextWidth = current.isEmpty ? size.width : currentWidth + spacing + size.width
            if !current.isEmpty && nextWidth > width {
                rows.append(FlowRow(items: current, height: currentHeight))
                current = [FlowItem(subview: subview, size: size)]
                currentWidth = size.width
                currentHeight = size.height
            } else {
                current.append(FlowItem(subview: subview, size: size))
                currentWidth = nextWidth
                currentHeight = max(currentHeight, size.height)
            }
        }

        if !current.isEmpty {
            rows.append(FlowRow(items: current, height: currentHeight))
        }
        return rows
    }

    private struct FlowItem {
        let subview: LayoutSubview
        let size: CGSize
    }

    private struct FlowRow {
        let items: [FlowItem]
        let height: CGFloat
    }
}

private extension Bill {
    func savedItem(chamber: Chamber, houseNo: Int) -> SavedResearchItem {
        SavedResearchItem(
            id: "bill:\(billYear):\(billNo)",
            type: .bill,
            title: title,
            subtitle: "Bill \(billNo) of \(billYear) · \(statusLabel)",
            citation: nil,
            quote: nil,
            sourceDate: lastUpdated,
            urlHash: "#/\(chamber.rawValue)/\(houseNo)/bill/\(billYear)/\(billNo)",
            chamber: chamber,
            houseNo: houseNo,
            savedAt: ""
        )
    }

    var statusLabel: String {
        let raw = status.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else { return "Bill" }
        return raw.prefix(1).uppercased() + raw.dropFirst()
    }

    var statusColor: Color {
        let s = status.lowercased()
        if s == "enacted" { return Color.darkGreen }
        if s == "defeated" || s == "rejected" { return Color.voteNilFg }
        if s == "current" || s == "published" { return Color(hex: "1e3a7a") }
        return Color.secondaryText
    }

    var statusBackground: Color {
        let s = status.lowercased()
        if s == "enacted" { return Color(hex: "d8f0dd") }
        if s == "defeated" || s == "rejected" { return Color.voteNilBg }
        if s == "current" || s == "published" { return Color(hex: "e8eef8") }
        return Color.cream
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

@MainActor
private final class SavedItemsModel: ObservableObject {
    @Published var items: [SavedResearchItem] = []
    @Published var copied = false

    func load() {
        items = SavedResearchStore.load()
    }

    func remove(_ item: SavedResearchItem) {
        SavedResearchStore.remove(id: item.id)
        load()
    }

    func copyDossier() {
        UIPasteboard.general.string = SavedResearchStore.buildDossier(items: items)
        copied = true
    }
}

private struct SavedItemsScreen: View {
    @EnvironmentObject private var session: AppSessionModel
    @StateObject private var model = SavedItemsModel()
    let navigate: (AppRoute) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Saved Items")
                    .font(.dmSerif(size: 28))
                    .foregroundColor(Color.headingText)
                Text("A private on-device reading list for records you want to revisit.")
                    .font(.inter(size: 13))
                    .foregroundColor(Color.secondaryText)
            }

            if model.items.isEmpty {
                Spacer()
                EmptyRouteState(
                    systemImage: "bookmark",
                    message: "No saved items yet. Use Save on members and bills to start a research dossier."
                )
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                HStack(spacing: 10) {
                    Button {
                        model.copyDossier()
                    } label: {
                        Label(model.copied ? "Copied" : "Copy Dossier", systemImage: "doc.on.doc")
                            .font(.inter(size: 12, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 9)
                            .background(Color.darkGreen)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    Text("\(model.items.count) \(model.items.count == 1 ? "item" : "items")")
                        .font(.inter(size: 12, weight: .semibold))
                        .foregroundColor(Color.secondaryText)

                    Spacer()
                }

                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(model.items) { item in
                            SavedItemRow(
                                item: item,
                                open: { open(item) },
                                remove: { model.remove(item) }
                            )
                        }
                    }
                    .padding(.bottom, 24)
                }
                .refreshable {
                    model.load()
                }
            }
        }
        .padding(18)
        .background(Color.cream)
        .onAppear {
            model.load()
        }
    }

    private func open(_ item: SavedResearchItem) {
        guard let parsed = parsePublicCollectionHash(item.urlHash) else { return }
        session.chamber = parsed.chamber
        session.selectedHouseNo = parsed.houseNo
        navigate(parsed.route)
    }
}

private struct SavedItemRow: View {
    let item: SavedResearchItem
    let open: () -> Void
    let remove: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Button(action: open) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        Text(item.type.label)
                            .font(.inter(size: 10, weight: .bold))
                            .foregroundColor(Color.darkGreen)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.voteTaBg)
                            .clipShape(Capsule())
                        Text(formatPublicCollectionDateValue(item.savedAt))
                            .font(.inter(size: 11, weight: .semibold))
                            .foregroundColor(Color.mutedText)
                        if let sourceDate = item.sourceDate, !sourceDate.isEmpty {
                            Text(formatPublicCollectionDateValue(sourceDate))
                                .font(.inter(size: 11, weight: .semibold))
                                .foregroundColor(Color.mutedText)
                        }
                    }

                    Text(item.title)
                        .font(.dmSerif(size: 18))
                        .foregroundColor(Color.headingText)
                        .fixedSize(horizontal: false, vertical: true)

                    if let subtitle = item.subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.inter(size: 12))
                            .foregroundColor(Color.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if let citation = item.citation, !citation.isEmpty {
                        Text(citation)
                            .font(.inter(size: 11))
                            .foregroundColor(Color.mutedText)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if let quote = item.quote, !quote.isEmpty {
                        Text(quote)
                            .font(.inter(size: 12))
                            .foregroundColor(Color.bodyText)
                            .lineLimit(4)
                            .lineSpacing(3)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            Button(action: remove) {
                Image(systemName: "trash")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color.voteNilFg)
                    .frame(width: 34, height: 34)
                    .background(Color.voteNilBg)
                    .clipShape(Circle())
            }
            .accessibilityLabel("Remove \(item.title)")
            .buttonStyle(.plain)
        }
        .padding(14)
        .cardStyle()
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
