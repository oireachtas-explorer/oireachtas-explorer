import SwiftUI

struct StageDots: View {
    let stages: [BillStage]

    private var doneCount: Int { stages.filter(\.isDone).count }
    private var currentIdx: Int {
        stages.firstIndex(where: { $0.isCurrent }) ?? max(0, doneCount - 1)
    }
    private var fillFraction: CGFloat {
        guard stages.count > 1 else { return 0 }
        if stages.allSatisfy(\.isDone) { return 1.0 }
        return CGFloat(currentIdx) / CGFloat(stages.count - 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            trackWithDots
            labelRow
        }
    }

    private var trackWithDots: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                // Background track
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.cardBorder)
                    .frame(height: 4)
                // Fill
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(hex: "3a9e52"))
                    .frame(width: geo.size.width * fillFraction, height: 4)
                // Dots
                HStack(spacing: 0) {
                    ForEach(Array(stages.enumerated()), id: \.offset) { i, s in
                        dotView(s)
                        if i < stages.count - 1 { Spacer(minLength: 0) }
                    }
                }
                .frame(maxWidth: .infinity)
                .offset(y: -5)
            }
        }
        .frame(height: 16)
    }

    private func dotView(_ s: BillStage) -> some View {
        Circle()
            .fill(dotFill(s))
            .frame(width: s.isCurrent ? 17 : 14, height: s.isCurrent ? 17 : 14)
            .overlay(Circle().stroke(dotFill(s), lineWidth: 2))
            .shadow(color: s.isCurrent ? Color.gold.opacity(0.4) : .clear, radius: 3)
    }

    private var labelRow: some View {
        HStack(spacing: 0) {
            ForEach(Array(stages.enumerated()), id: \.offset) { i, s in
                let show = i == 0 || i == stages.count - 1 || s.isCurrent
                Text(s.name)
                    .font(.inter(size: 8, weight: s.isCurrent ? .bold : .medium))
                    .foregroundColor(s.isCurrent ? Color.gold : Color.mutedText)
                    .opacity(show ? 1 : 0)
                    .frame(
                        maxWidth: .infinity,
                        alignment: i == 0 ? .leading : (i == stages.count - 1 ? .trailing : .center)
                    )
            }
        }
    }

    private func dotFill(_ s: BillStage) -> Color {
        if s.isCurrent { return Color.gold }
        if s.isDone    { return Color(hex: "3a9e52") }
        return Color.cardBorder
    }
}

#Preview {
    let stages = [
        BillStage(id: "intro", name: "Intro", date: "2025-01-15", house: "Dáil Éireann", outcome: nil, isDone: true, isCurrent: false),
        BillStage(id: "first", name: "1st", date: "2025-01-15", house: "Dáil Éireann", outcome: nil, isDone: true, isCurrent: false),
        BillStage(id: "second", name: "2nd", date: nil, house: "Dáil Éireann", outcome: nil, isDone: false, isCurrent: true),
        BillStage(id: "committee", name: "Committee", date: nil, house: "Dáil Éireann", outcome: nil, isDone: false, isCurrent: false),
        BillStage(id: "report", name: "Report", date: nil, house: "Dáil Éireann", outcome: nil, isDone: false, isCurrent: false),
        BillStage(id: "third", name: "3rd", date: nil, house: "Dáil Éireann", outcome: nil, isDone: false, isCurrent: false),
        BillStage(id: "enacted", name: "Enacted", date: nil, house: "Dáil Éireann", outcome: nil, isDone: false, isCurrent: false),
    ]
    StageDots(stages: stages).padding()
}
