import SwiftUI

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var recentDebates: [Debate] = []
    @Published var memberCount: Int = 0
    @Published var constituencyCount: Int = 0
    @Published var debateCount: Int = 0
    @Published var isLoading = false
    @Published var error: String?

    func load(chamber: Chamber, houseNo: Int) async {
        isLoading = true
        error = nil
        do {
            let chamberId = houseUri(chamber: chamber, houseNo: houseNo)
            async let debatesResult = OireachtasAPI.shared.getDebates(chamberId: chamberId, limit: 5)
            async let membersResult = OireachtasAPI.shared.getMembers(chamber: chamber, houseNo: houseNo)
            async let constituenciesResult = OireachtasAPI.shared.getConstituencies(chamber: chamber, houseNo: houseNo)

            let (debates, total) = try await debatesResult
            let members = try await membersResult
            let constituencies = try await constituenciesResult

            recentDebates = debates
            debateCount = total
            memberCount = members.count
            constituencyCount = constituencies.count
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct HomeView: View {
    @StateObject private var vm = HomeViewModel()
    @EnvironmentObject private var session: AppSessionModel
    @Binding var selectedTab: AppTab
    let navigate: (AppRoute) -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                heroSection
                SessionPicker()
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                statsSection
                recentDebatesSection
                attributionSection
            }
        }
        .background(Color.cream)
        .refreshable {
            await vm.load(chamber: session.chamber, houseNo: session.selectedHouseNo)
        }
        .task(id: "\(session.chamber.rawValue)-\(session.selectedHouseNo)") {
            await vm.load(chamber: session.chamber, houseNo: session.selectedHouseNo)
        }
    }

    // MARK: - Hero

    private var heroSection: some View {
        ZStack {
            LinearGradient(
                colors: [Color.forestGreen, Color(hex: "1a3d22")],
                startPoint: .top, endPoint: .bottom
            )
            VStack(alignment: .center, spacing: 0) {
                Text("\(session.chamber.title) · \(session.selectedHouse.label(for: session.chamber))")
                    .font(.inter(size: 10, weight: .bold))
                    .tracking(1.0)
                    .foregroundColor(.white.opacity(0.7))
                    .textCase(.uppercase)
                    .padding(.bottom, 14)

                (Text("Ireland's Parliament,\n")
                    .font(.dmSerif(size: 28))
                + Text("Open to All.")
                    .font(.dmSerif(size: 28, italic: true))
                    .foregroundColor(Color(hex: "f5e8c0")))
                .multilineTextAlignment(.center)
                .foregroundColor(.white)
                .lineSpacing(2)
                .padding(.bottom, 14)

                Text("Explore \(vm.memberCount) \(session.chamber.pluralMemberNoun) — their voting records, speeches and debates.")
                    .font(.inter(size: 14))
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.bottom, 24)

                Button { selectedTab = .members } label: {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.white.opacity(0.7))
                            .font(.system(size: 15))
                            .accessibilityHidden(true)
                        Text("Search your \(session.chamber == .dail ? "constituency" : "panel")…")
                            .font(.inter(size: 15))
                            .foregroundColor(.white.opacity(0.6))
                        Spacer()
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 13)
                    .background(Color.white.opacity(0.12))
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(Color.white.opacity(0.2), lineWidth: 1.5))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Search \(session.chamber.pluralMemberNoun) by \(session.chamber == .dail ? "constituency" : "panel")")
            }
            .padding(.horizontal, 20)
            .padding(.top, 36)
            .padding(.bottom, 32)
        }
    }

    // MARK: - Stats

    private var statsSection: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                StatCell(number: "\(vm.memberCount)", label: session.chamber.pluralMemberNoun)
                    .overlay(Rectangle().frame(width: 1).foregroundColor(Color.cardBorder), alignment: .trailing)
                StatCell(number: "\(vm.constituencyCount)", label: session.chamber == .dail ? "Constituencies" : "Panels")
            }
            Divider().background(Color.cardBorder)
            HStack(spacing: 0) {
                StatCell(number: session.selectedHouse.ordinal, label: session.chamber.title)
                    .overlay(Rectangle().frame(width: 1).foregroundColor(Color.cardBorder), alignment: .trailing)
                StatCell(number: formattedCount(vm.debateCount), label: "Debates")
            }
        }
        .background(Color.white)
        .overlay(
            Rectangle().frame(height: 1).foregroundColor(Color.cardBorder),
            alignment: .bottom
        )
    }

    // MARK: - Recent Debates

    private var recentDebatesSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Recent Debates")
                .font(.dmSerif(size: 20))
                .foregroundColor(Color.headingText)

            if vm.isLoading {
                LoadingView()
            } else if let err = vm.error {
                ErrorBanner(message: err)
            } else {
                ForEach(vm.recentDebates) { debate in
                    if let xmlUri = debate.rawXmlUri, let sectionUri = debate.debateSectionUri {
                        Button {
                            navigate(.debateViewer(
                                xmlUri: xmlUri,
                                debateSectionUri: sectionUri,
                                title: debate.title,
                                focusMemberUri: nil
                            ))
                        } label: {
                            DebateItemRow(
                                title: debate.title,
                                date: debate.formattedDate,
                                typeLabel: friendlyType(debate.debateType)
                            )
                        }
                        .buttonStyle(.plain)
                    } else {
                        DebateItemRow(
                            title: debate.title,
                            date: debate.formattedDate,
                            typeLabel: friendlyType(debate.debateType)
                        )
                    }
                }
            }
        }
        .padding(16)
    }

    // MARK: - Attribution

    private var attributionSection: some View {
        Text("Data sourced from the Oireachtas Open Data API · CC-BY 4.0")
            .font(.inter(size: 11))
            .foregroundColor(Color.mutedText)
            .multilineTextAlignment(.center)
            .padding(16)
    }
}

private func formattedCount(_ value: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    return formatter.string(from: NSNumber(value: value)) ?? "\(value)"
}

private func friendlyType(_ debateType: String) -> String {
    switch debateType.lowercased() {
    case "questions": return "Questions"
    case "debate":    return "Debate"
    case "division":  return "Vote"
    default:          return debateType.isEmpty ? "" : debateType
    }
}

#Preview {
    HomeView(selectedTab: .constant(.home), navigate: { _ in })
        .environmentObject(AppSessionModel())
}
