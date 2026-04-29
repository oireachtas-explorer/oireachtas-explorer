import SwiftUI
import SafariServices

// MARK: - ViewModel

@MainActor
final class DebatesViewModel: ObservableObject {
    @Published var debates: [Debate] = []
    @Published var isLoading = false
    @Published var isLoadingMore = false
    @Published var error: String?
    @Published var total = 0
    @Published var selectedType: String = "All"
    @Published var searchText: String = ""
    @Published var startDate: Date?
    @Published var endDate: Date?

    private var skip = 0
    // Fetch a larger initial page so client-side filters have something to
    // bite on. The Oireachtas API doesn't expose a debate-type query param,
    // so type pills filter the loaded set rather than re-querying.
    private let pageSize = 50

    var hasMore: Bool { debates.count < total }

    var filteredDebates: [Debate] {
        var filtered = debates
        if selectedType != "All" {
            filtered = filtered.filter { matchesType($0, type: selectedType) }
        }
        if !searchText.isEmpty {
            filtered = filtered.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
        }
        return filtered
    }

    var byMonth: [(key: String, label: String, debates: [Debate])] {
        let grouped = Dictionary(grouping: filteredDebates, by: \.monthKey)
        return grouped.keys.sorted(by: >).map { key in
            (key: key, label: grouped[key]!.first!.monthLabel, debates: grouped[key]!)
        }
    }

    func load(reset: Bool = false) async {
        if reset { skip = 0; debates = [] }
        guard !isLoading else { return }
        isLoading = true
        error = nil
        do {
            let df = DateFormatter()
            df.dateFormat = "yyyy-MM-dd"
            let start = startDate.map { df.string(from: $0) }
            let end = endDate.map { df.string(from: $0) }

            let (newDebates, newTotal) = try await OireachtasAPI.shared.getDebates(
                chamberId: currentDailChamberUri,
                dateStart: start,
                dateEnd: end,
                limit: pageSize, skip: skip
            )
            debates.append(contentsOf: newDebates)
            total = newTotal
            skip += newDebates.count
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadMore() async {
        guard hasMore, !isLoadingMore else { return }
        isLoadingMore = true
        await load()
        isLoadingMore = false
    }

    private func matchesType(_ d: Debate, type: String) -> Bool {
        let t = d.title.lowercased()
        let dt = d.debateType.lowercased()
        switch type {
        case "Committee":   return dt.contains("committee") || t.contains("committee") || t.contains("joint")
        case "Bill":        return dt.contains("bill") || t.contains("bill")
        case "Leaders' Q":  return dt.contains("leaders") || t.contains("leaders")
        case "Statements":  return dt.contains("statement") || t.contains("statement") || t.contains("topical")
        default: return true
        }
    }
}

// MARK: - View

struct DebatesView: View {
    @StateObject private var vm = DebatesViewModel()
    @State private var showFilters = false
    @State private var safariURL: URL?

    private let types = ["All", "Bill", "Leaders' Q", "Statements", "Committee"]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                AppHeader()
                debatesContent
            }
            .background(Color.cream)
            .navigationBarHidden(true)
        }
        .task { await vm.load() }
    }

    // MARK: - Content

    private var debatesContent: some View {
        VStack(spacing: 0) {
            // Page title
            VStack(alignment: .leading, spacing: 4) {
                Text("Dáil Debates")
                    .font(.dmSerif(size: 26))
                    .foregroundColor(Color.headingText)
                Text("Official records · 34th Dáil")
                    .font(.inter(size: 13))
                    .foregroundColor(Color.secondaryText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.top, 20)
            .padding(.bottom, 12)

            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Color.mutedText)
                TextField("Search debates…", text: $vm.searchText)
                    .font(.inter(size: 15))
                    .foregroundColor(Color.headingText)
                if !vm.searchText.isEmpty {
                    Button { vm.searchText = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Color.mutedText)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.cardBorder, lineWidth: 1.5))
            .padding(.horizontal, 16)
            .padding(.bottom, 12)

            // Type filter pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(types, id: \.self) { t in
                        FilterPill(label: t, isActive: vm.selectedType == t) {
                            vm.selectedType = t
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.bottom, 12)

            // Filter toggle
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { showFilters.toggle() }
            } label: {
                HStack {
                    Text("Date Filters")
                        .font(.inter(size: 14, weight: .semibold))
                        .foregroundColor(Color.bodyText)
                    Spacer()
                    if vm.startDate != nil || vm.endDate != nil {
                        Text("Active")
                            .font(.inter(size: 10, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.darkGreen)
                            .clipShape(Capsule())
                    }
                    Image(systemName: showFilters ? "chevron.up" : "chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(Color.mutedText)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 11)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.cardBorder, lineWidth: 1.5)
                )
                .padding(.horizontal, 16)
            }
            .buttonStyle(.plain)
            .padding(.bottom, 8)

            if showFilters {
                VStack(spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("FROM").font(.inter(size: 9, weight: .bold)).foregroundColor(Color.mutedText)
                            DatePicker("", selection: Binding(get: { vm.startDate ?? Date() }, set: { vm.startDate = $0 }), displayedComponents: .date)
                                .labelsHidden()
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("TO").font(.inter(size: 9, weight: .bold)).foregroundColor(Color.mutedText)
                            DatePicker("", selection: Binding(get: { vm.endDate ?? Date() }, set: { vm.endDate = $0 }), displayedComponents: .date)
                                .labelsHidden()
                        }
                    }
                    
                    HStack {
                        Button("Clear Dates") {
                            vm.startDate = nil
                            vm.endDate = nil
                            Task { await vm.load(reset: true) }
                        }
                        .font(.inter(size: 12, weight: .semibold))
                        .foregroundColor(.red)
                        
                        Spacer()
                        
                        Button("Apply Filters") {
                            Task { await vm.load(reset: true) }
                        }
                        .font(.inter(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.darkGreen)
                        .clipShape(Capsule())
                    }
                }
                .padding(16)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
            }

            // Debate list
            if vm.isLoading && vm.debates.isEmpty {
                LoadingView()
                Spacer()
            } else if let err = vm.error, vm.debates.isEmpty {
                ErrorBanner(message: err)
                Spacer()
            } else {
                debatesList
            }
        }
    }

    private var debatesList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0, pinnedViews: []) {
                ForEach(vm.byMonth, id: \.key) { section in
                    // Month header
                    Text(section.label.uppercased())
                        .font(.inter(size: 12, weight: .bold))
                        .tracking(0.8)
                        .foregroundColor(Color.mutedText)
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                        .padding(.bottom, 8)

                    ForEach(section.debates) { debate in
                        debateRow(debate)
                            .padding(.horizontal, 16)
                            .padding(.bottom, 8)
                    }
                }

                // Empty-filter hint
                if vm.selectedType != "All" && vm.filteredDebates.isEmpty && !vm.debates.isEmpty {
                    Text("No \(vm.selectedType) debates in the loaded results — try Load more.")
                        .font(.inter(size: 12))
                        .foregroundColor(Color.mutedText)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                }

                // Load more
                if vm.hasMore {
                    Button {
                        Task { await vm.loadMore() }
                    } label: {
                        if vm.isLoadingMore {
                            ProgressView().tint(Color.darkGreen)
                        } else {
                            Text("Load more")
                                .font(.inter(size: 14, weight: .semibold))
                                .foregroundColor(Color.darkGreen)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                }
            }
            .padding(.bottom, 16)
        }
    }

    @ViewBuilder
    private func debateRow(_ debate: Debate) -> some View {
        if let xmlUri = debate.rawXmlUri, let sectionUri = debate.debateSectionUri {
            NavigationLink(destination: DebateTranscriptView(title: debate.title, xmlUri: xmlUri, debateSectionUri: sectionUri, focusMemberUri: nil)) {
                debateRowContent(debate)
            }
            .buttonStyle(.plain)
        } else {
            debateRowContent(debate)
        }
    }

    private func debateRowContent(_ debate: Debate) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(debate.title)
                .font(.inter(size: 13, weight: .semibold))
                .foregroundColor(Color.headingText)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 6) {
                Text(debate.formattedDate)
                    .font(.inter(size: 11))
                    .foregroundColor(Color.mutedText)
                if !debate.debateType.isEmpty {
                    TypeChip(text: debate.debateType)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .cardStyle()
    }
}





#Preview {
    DebatesView()
}
