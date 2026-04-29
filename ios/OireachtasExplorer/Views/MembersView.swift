import SwiftUI

// MARK: - ViewModel

@MainActor
final class MembersViewModel: ObservableObject {
    @Published var constituencies: [Constituency] = []
    @Published var members: [Member] = []
    @Published var isLoadingConstituencies = false
    @Published var isLoadingMembers = false
    @Published var error: String?

    func loadConstituencies() async {
        guard constituencies.isEmpty else { return }
        isLoadingConstituencies = true
        error = nil
        do {
            constituencies = try await OireachtasAPI.shared.getConstituencies()
        } catch {
            self.error = error.localizedDescription
        }
        isLoadingConstituencies = false
    }

    func loadMembers(for constituency: Constituency) async {
        isLoadingMembers = true
        error = nil
        do {
            members = try await OireachtasAPI.shared.getMembers(constCode: constituency.id)
        } catch {
            self.error = error.localizedDescription
        }
        isLoadingMembers = false
    }
}

// MARK: - Main View

struct MembersView: View {
    @StateObject private var vm = MembersViewModel()
    @State private var selectedConstituency: Constituency?
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                AppHeader()
                if let constituency = selectedConstituency {
                    ConstituencyDetailView(
                        constituency: constituency,
                        members: vm.members,
                        isLoading: vm.isLoadingMembers,
                        error: vm.error,
                        onBack: { selectedConstituency = nil }
                    )
                    .task { await vm.loadMembers(for: constituency) }
                } else {
                    constituencyList
                        .task { await vm.loadConstituencies() }
                }
            }
            .background(Color.cream)
            .navigationBarHidden(true)
            .refreshable {
                if selectedConstituency == nil {
                    await vm.loadConstituencies()
                } else if let c = selectedConstituency {
                    await vm.loadMembers(for: c)
                }
            }
        }
    }

    // MARK: - Constituency list

    private var filteredConstituencies: [Constituency] {
        guard !searchText.isEmpty else { return vm.constituencies }
        return vm.constituencies.filter {
            $0.name.localizedCaseInsensitiveContains(searchText)
        }
    }

    private var constituencyList: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Color.mutedText)
                TextField("Search constituency…", text: $searchText)
                    .font(.inter(size: 15))
                    .foregroundColor(Color.headingText)
                if !searchText.isEmpty {
                    Button { searchText = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Color.mutedText)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            if vm.isLoadingConstituencies {
                LoadingView()
                Spacer()
            } else if let err = vm.error {
                ErrorBanner(message: err)
                Spacer()
            } else {
                List(filteredConstituencies) { constituency in
                    Button {
                        vm.members = []
                        selectedConstituency = constituency
                    } label: {
                        HStack {
                            Text(constituency.name)
                                .font(.inter(size: 15))
                                .foregroundColor(Color.headingText)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Color.mutedText)
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(Color.white)
                }
                .listStyle(.plain)
                .background(Color.cream)
            }
        }
    }
}

// MARK: - Constituency Detail

struct ConstituencyDetailView: View {
    let constituency: Constituency
    let members: [Member]
    let isLoading: Bool
    let error: String?
    let onBack: () -> Void

    @State private var selectedParty: String = "All"
    @State private var selectedMember: Member?

    private var parties: [String] {
        ["All"] + Array(Set(members.map(\.party))).sorted()
    }

    private var filteredMembers: [Member] {
        selectedParty == "All" ? members : members.filter { $0.party == selectedParty }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Back + header
            VStack(alignment: .leading, spacing: 4) {
                Button(action: onBack) {
                    HStack(spacing: 6) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 12, weight: .semibold))
                        Text("All Constituencies")
                            .font(.inter(size: 13, weight: .semibold))
                    }
                    .foregroundColor(Color.secondaryText)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(Color.white)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(Color.cardBorder, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .padding(.bottom, 8)

                Text(constituency.name)
                    .font(.dmSerif(size: 24))
                    .foregroundColor(Color.headingText)
                Text("\(members.count) member\(members.count == 1 ? "" : "s") · 34th Dáil")
                    .font(.inter(size: 13))
                    .foregroundColor(Color.secondaryText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 8)

            if isLoading {
                LoadingView()
                Spacer()
            } else if let err = error {
                ErrorBanner(message: err)
                Spacer()
            } else {
                // Party filter pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(parties, id: \.self) { party in
                            FilterPill(label: party, isActive: selectedParty == party) {
                                selectedParty = party
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }

                // Member grid
                ScrollView {
                    LazyVGrid(
                        columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                        spacing: 10
                    ) {
                        ForEach(filteredMembers) { member in
                            NavigationLink(destination: MemberProfileView(member: member)) {
                                MemberCardView(member: member)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                }
            }
        }
        .navigationDestination(isPresented: .constant(false)) {
            EmptyView()
        }
    }
}

// MARK: - Member Card

struct MemberCardView: View {
    let member: Member

    var body: some View {
        VStack(spacing: 0) {
            // Party colour top stripe
            Rectangle()
                .fill(partyColor(member.party))
                .frame(height: 4)

            VStack(spacing: 8) {
                AvatarView(member: member, size: 56)
                Text(member.fullName)
                    .font(.inter(size: 12, weight: .semibold))
                    .foregroundColor(Color.headingText)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                PartyBadge(party: member.party)
                if let office = member.primaryOffice {
                    Text(office.count > 20 ? String(office.prefix(18)) + "…" : office)
                        .font(.inter(size: 9, weight: .semibold))
                        .foregroundColor(Color.gold)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(Color.voteGoldBg)
                        .clipShape(Capsule())
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity)
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.04), radius: 3, x: 0, y: 1)
    }
}

#Preview {
    MembersView()
}
