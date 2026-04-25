import SwiftUI

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var recentDebates: [Debate] = []
    @Published var isLoading = false
    @Published var error: String?

    func load() async {
        guard recentDebates.isEmpty else { return }
        isLoading = true
        error = nil
        do {
            let (debates, _) = try await OireachtasAPI.shared.getDebates(
                chamberId: currentDailChamberUri, limit: 5
            )
            recentDebates = debates
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct HomeView: View {
    @StateObject private var vm = HomeViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    heroSection
                    statsSection
                    recentDebatesSection
                    attributionSection
                }
            }
            .background(Color.cream)
            .navigationBarHidden(true)
        }
        .task { await vm.load() }
    }

    // MARK: - Hero

    private var heroSection: some View {
        ZStack {
            LinearGradient(
                colors: [Color.forestGreen, Color(hex: "1a3d22")],
                startPoint: .top, endPoint: .bottom
            )
            VStack(alignment: .center, spacing: 0) {
                Text("Dáil Éireann · 34ú Dáil")
                    .font(.inter(size: 10, weight: .bold))
                    .tracking(1.0)
                    .foregroundColor(.white.opacity(0.5))
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

                Text("Explore 174 TDs — their voting records, speeches and debates.")
                    .font(.inter(size: 14))
                    .foregroundColor(.white.opacity(0.65))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.bottom, 24)

                // Search bar (decorative — navigation is via Members tab)
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.white.opacity(0.5))
                        .font(.system(size: 15))
                    Text("Search your constituency…")
                        .font(.inter(size: 15))
                        .foregroundColor(.white.opacity(0.4))
                    Spacer()
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 13)
                .background(Color.white.opacity(0.12))
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Color.white.opacity(0.2), lineWidth: 1.5))
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
                StatCell(number: "174",  label: "TDs")
                    .overlay(Rectangle().frame(width: 1).foregroundColor(Color.cardBorder), alignment: .trailing)
                StatCell(number: "43",   label: "Constituencies")
            }
            Divider().background(Color.cardBorder)
            HStack(spacing: 0) {
                StatCell(number: "34th", label: "Dáil")
                    .overlay(Rectangle().frame(width: 1).foregroundColor(Color.cardBorder), alignment: .trailing)
                StatCell(number: "2,847", label: "Debates")
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
                    DebateItemRow(
                        title: debate.title,
                        date: debate.formattedDate,
                        typeLabel: friendlyType(debate.debateType)
                    )
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

private func friendlyType(_ debateType: String) -> String {
    switch debateType.lowercased() {
    case "questions": return "Questions"
    case "debate":    return "Debate"
    case "division":  return "Vote"
    default:          return debateType.isEmpty ? "" : debateType
    }
}

#Preview {
    HomeView()
}
