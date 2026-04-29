import SwiftUI
import SafariServices

// MARK: - Color Helpers

extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: h).scanHexInt64(&int)
        let r, g, b: UInt64
        switch h.count {
        case 3:  (r, g, b) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:  (r, g, b) = (int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default: (r, g, b) = (0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255)
    }
}

// MARK: - Brand Colours

extension Color {
    static let forestGreen   = Color(hex: "0c2b16")   // header/primary
    static let darkGreen     = Color(hex: "1a5228")   // interactive green
    static let cream         = Color(hex: "f5f2eb")   // app background
    static let gold          = Color(hex: "b8860b")   // accent / current stage
    static let cardBorder    = Color(hex: "ddd8cc")
    static let mutedText     = Color(hex: "9a9070")
    static let secondaryText = Color(hex: "6a6448")
    static let bodyText      = Color(hex: "3a3620")
    static let headingText   = Color(hex: "1a180f")

    // Vote colours
    static let voteTaBg      = Color(hex: "e8f5eb")
    static let voteTaFg      = Color(hex: "1a7a30")
    static let voteNilBg     = Color(hex: "fce8e8")
    static let voteNilFg     = Color(hex: "c62828")
    static let voteGoldBg    = Color(hex: "fdf3d8")
}

// MARK: - Party Data

struct Party {
    let name: String
    let short: String
    let color: Color
}

let allParties: [Party] = [
    Party(name: "Fianna Fáil",          short: "FF",  color: Color(hex: "169B62")),
    Party(name: "Sinn Féin",            short: "SF",  color: Color(hex: "2E6B5B")),
    Party(name: "Fine Gael",            short: "FG",  color: Color(hex: "0065BD")),
    Party(name: "Green Party",          short: "GP",  color: Color(hex: "5CAD3A")),
    Party(name: "Independent",          short: "Ind", color: Color(hex: "6B7280")),
    Party(name: "Labour",               short: "Lab", color: Color(hex: "CC0000")),
    Party(name: "Social Democrats",     short: "SD",  color: Color(hex: "7B2FA0")),
    Party(name: "People Before Profit", short: "PBP", color: Color(hex: "D42B4E")),
    Party(name: "Aontú",                short: "Aon", color: Color(hex: "7B0000")),
]

func partyColor(_ name: String) -> Color {
    allParties.first { $0.name == name }?.color ?? Color(hex: "6B7280")
}

func partyShort(_ name: String) -> String {
    allParties.first { $0.name == name }?.short ?? String(name.prefix(3))
}

// MARK: - Typography
// DM Serif Display ships in Regular + Italic variants.
// Add the .ttf files to the project and register them in Info.plist to activate.
// Without the files, these fall back to Georgia (a close serif match).

extension Font {
    static func dmSerif(size: CGFloat, italic: Bool = false) -> Font {
        let name = italic ? "DMSerifDisplay-Italic" : "DMSerifDisplay-Regular"
        return UIFont(name: name, size: size) != nil
            ? .custom(name, size: size)
            : .custom("Georgia\(italic ? "-Italic" : "")", size: size)
    }

    static func inter(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
}

// MARK: - Card Modifier

struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.cardBorder, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.04), radius: 3, x: 0, y: 1)
    }
}

extension View {
    func cardStyle() -> some View { modifier(CardStyle()) }
}

// MARK: - Filter Pill

struct FilterPill: View {
    let label: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.inter(size: 12, weight: .semibold))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isActive ? Color.darkGreen : Color.white)
                .foregroundColor(isActive ? .white : Color.bodyText)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(isActive ? Color.darkGreen : Color.cardBorder, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Type Chip

struct TypeChip: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.inter(size: 9, weight: .bold))
            .tracking(0.3)
            .padding(.horizontal, 7)
            .padding(.vertical, 2)
            .background(Color(hex: "d8f0dd"))
            .foregroundColor(Color.darkGreen)
            .clipShape(Capsule())
    }
}

// MARK: - Debate Item Row (shared across Home + Debates + Profile)

struct DebateItemRow: View {
    let title: String
    let date: String
    let typeLabel: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.inter(size: 13, weight: .semibold))
                .foregroundColor(Color.headingText)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 6) {
                Text(date)
                    .font(.inter(size: 11))
                    .foregroundColor(Color.mutedText)
                if !typeLabel.isEmpty {
                    TypeChip(text: typeLabel)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .cardStyle()
    }
}

// MARK: - Stat Cell

struct StatCell: View {
    let number: String
    let label: String

    var body: some View {
        VStack(spacing: 3) {
            Text(number)
                .font(.dmSerif(size: 22))
                .foregroundColor(Color.darkGreen)
            Text(label.uppercased())
                .font(.inter(size: 10, weight: .bold))
                .tracking(0.7)
                .foregroundColor(Color.mutedText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .padding(.horizontal, 10)
    }
}

// MARK: - Loading / Error helpers

struct LoadingView: View {
    var body: some View {
        HStack { Spacer(); ProgressView().tint(Color.darkGreen); Spacer() }
            .padding(24)
    }
}

struct ErrorBanner: View {
    let message: String
    var body: some View {
        Text(message)
            .font(.inter(size: 13))
            .foregroundColor(.red)
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Green Header Bar

struct AppHeader: View {
    var body: some View {
        HStack(spacing: 10) {
            // Parliament logo
            Image(systemName: "building.columns.fill")
                .font(.system(size: 18))
                .foregroundColor(.white)
            Text("Oireachtas Explorer")
                .font(.dmSerif(size: 16))
                .foregroundColor(.white)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.forestGreen)
    }
}

// MARK: - SafariView Wrapper

struct SafariView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
