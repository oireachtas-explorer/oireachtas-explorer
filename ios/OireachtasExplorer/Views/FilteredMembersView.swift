import SwiftUI

enum FilterType: Equatable {
    case party(String)
    case committee(String)
    
    var title: String {
        switch self {
        case .party(let p): return p
        case .committee(let c): return c
        }
    }
    
    var subtitle: String {
        switch self {
        case .party: return "Party Members"
        case .committee: return "Committee Members"
        }
    }
}

@MainActor
final class FilteredMembersViewModel: ObservableObject {
    @Published var members: [Member] = []
    @Published var isLoading = false
    @Published var error: String?
    
    func load(filter: FilterType) async {
        guard members.isEmpty else { return }
        isLoading = true
        error = nil
        do {
            let allMembers = try await OireachtasAPI.shared.getMembers()
            switch filter {
            case .party(let partyName):
                members = allMembers.filter { $0.party == partyName }
            case .committee(let committeeName):
                members = allMembers.filter { member in
                    member.committees.contains { $0.name == committeeName }
                }
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct FilteredMembersView: View {
    let filter: FilterType
    
    @StateObject private var vm = FilteredMembersViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 0) {
            header
            
            if vm.isLoading {
                Spacer()
                LoadingView()
                Spacer()
            } else if let err = vm.error {
                Spacer()
                ErrorBanner(message: err)
                Spacer()
            } else if vm.members.isEmpty {
                Spacer()
                Text("No members found.")
                    .font(.inter(size: 15))
                    .foregroundColor(Color.mutedText)
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(
                        columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                        spacing: 10
                    ) {
                        ForEach(vm.members) { member in
                            NavigationLink(destination: MemberProfileView(member: member)) {
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
        .task {
            await vm.load(filter: filter)
        }
    }
    
    private var header: some View {
        HStack(spacing: 12) {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
            }
            .buttonStyle(.plain)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(filter.title)
                    .font(.dmSerif(size: 18))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text(filter.subtitle)
                    .font(.inter(size: 11))
                    .foregroundColor(.white.opacity(0.8))
            }
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.forestGreen)
    }
}
