import SwiftUI

@MainActor
final class DebateTranscriptViewModel: ObservableObject {
    @Published var segments: [SpeechSegment] = []
    @Published var participantsSummary = ""
    @Published var isLoading = false
    @Published var error: String?
    
    func load(xmlUri: String, debateSectionUri: String, focusMemberUri: String?) async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        
        do {
            let loaded = try await TranscriptAPI.shared.fetchTranscript(xmlUri: xmlUri, debateSectionUri: debateSectionUri)
            segments = loaded
            participantsSummary = Self.participantsSummary(for: loaded)
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }

    private static func participantsSummary(for segments: [SpeechSegment]) -> String {
        var seen = Set<String>()
        var names: [String] = []
        for segment in segments where !seen.contains(segment.speakerName) {
            seen.insert(segment.speakerName)
            names.append(segment.speakerName)
        }
        return names.joined(separator: ", ")
    }
}

struct DebateTranscriptView: View {
    let title: String
    let xmlUri: String
    let debateSectionUri: String
    let focusMemberUri: String?
    
    @StateObject private var vm = DebateTranscriptViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 0) {
            header
            content
        }
        .background(Color.cream)
        .navigationBarHidden(true)
        .task {
            await vm.load(xmlUri: xmlUri, debateSectionUri: debateSectionUri, focusMemberUri: focusMemberUri)
        }
    }
    
    private var header: some View {
        HStack(spacing: 12) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
            }
            .buttonStyle(.plain)
            
            Text(title)
                .font(.dmSerif(size: 18))
                .foregroundColor(.white)
                .lineLimit(1)
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color.forestGreen)
    }
    
    @ViewBuilder
    private var content: some View {
        if vm.isLoading {
            VStack {
                Spacer()
                ProgressView().tint(Color.darkGreen)
                Text("Loading official record...")
                    .font(.inter(size: 13))
                    .foregroundColor(Color.mutedText)
                    .padding(.top, 8)
                Spacer()
            }
        } else if let error = vm.error {
            VStack {
                Spacer()
                Text("Failed to load transcript")
                    .font(.inter(size: 15, weight: .semibold))
                    .foregroundColor(.red)
                Text(error)
                    .font(.inter(size: 13))
                    .foregroundColor(Color.mutedText)
                    .multilineTextAlignment(.center)
                    .padding()
                Spacer()
            }
        } else if vm.segments.isEmpty {
            VStack {
                Spacer()
                Text("No speech segments found.")
                    .font(.inter(size: 15))
                    .foregroundColor(Color.mutedText)
                Spacer()
            }
        } else {
            ScrollView {
                LazyVStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Participants")
                            .font(.inter(size: 12, weight: .bold))
                            .foregroundColor(Color.mutedText)
                            .tracking(0.5)
                            .textCase(.uppercase)
                        
                        Text(vm.participantsSummary)
                            .font(.inter(size: 13))
                            .foregroundColor(Color.secondaryText)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    
                    ForEach(vm.segments) { segment in
                        speechSegment(segment)
                            .padding(.horizontal, 16)
                    }
                }
                .padding(.bottom, 24)
            }
        }
    }
    
    private func speechSegment(_ segment: SpeechSegment) -> some View {
        let isFocal = focusMemberUri != nil && segment.memberUri == focusMemberUri
        
        return HStack(alignment: .top, spacing: 12) {
            // Avatar
            if let uri = segment.memberUri {
                NavigationLink(destination: MemberProfileLoaderView(memberUri: uri)) {
                    let mockMember = Member(id: segment.speakerId, uri: uri, memberCode: segment.speakerId, fullName: segment.speakerName, firstName: nil, lastName: nil, party: "Independent", constituency: "", constituencyCode: "", photoUrl: memberPhotoUrl(uri), offices: [], committees: [])
                    AvatarView(member: mockMember, size: 48)
                }
                .buttonStyle(.plain)
            } else {
                ZStack {
                    Circle().fill(Color(hex: "e8eef8"))
                    Text(String(segment.speakerName.prefix(1)).uppercased())
                        .font(.dmSerif(size: 20))
                        .foregroundColor(Color(hex: "1e3a7a"))
                }
                .frame(width: 48, height: 48)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                if let uri = segment.memberUri {
                    NavigationLink(destination: MemberProfileLoaderView(memberUri: uri)) {
                        Text(segment.speakerName)
                            .font(.inter(size: 15, weight: .bold))
                            .foregroundColor(Color.headingText)
                    }
                    .buttonStyle(.plain)
                } else {
                    Text(segment.speakerName)
                        .font(.inter(size: 15, weight: .bold))
                        .foregroundColor(Color.headingText)
                }
                
                if let html = segment.htmlContent, !html.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    HTMLText(html: html)
                } else {
                    ForEach(Array(segment.paragraphs.enumerated()), id: \.offset) { _, paragraph in
                        Text(paragraph)
                            .font(.inter(size: 15))
                            .foregroundColor(Color.bodyText)
                            .lineSpacing(4)
                    }
                }
            }
            
            Spacer()
        }
        .padding(isFocal ? 14 : 0)
        .background(isFocal ? Color(hex: "e8f5eb") : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            Group {
                if isFocal {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(Color.darkGreen.opacity(0.3), lineWidth: 1)
                }
            }
        )
    }
}

import WebKit

struct HTMLText: View {
    let html: String
    @State private var dynamicHeight: CGFloat = .zero

    var body: some View {
        HTMLWebView(html: html, dynamicHeight: $dynamicHeight)
            .frame(height: dynamicHeight)
    }
}

struct HTMLWebView: UIViewRepresentable {
    let html: String
    @Binding var dynamicHeight: CGFloat

    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: HTMLWebView

        init(_ parent: HTMLWebView) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            webView.evaluateJavaScript("document.documentElement.scrollHeight", completionHandler: { (height, error) in
                DispatchQueue.main.async {
                    if let height = height as? CGFloat {
                        self.parent.dynamicHeight = height
                    }
                }
            })
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        let styledHtml = """
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 15px;
                color: #3a3620;
                line-height: 1.5;
                margin: 0;
                padding: 0;
            }
            p { margin-bottom: 1em; font-size: 15px; }
            .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1em; padding-bottom: 4px; }
            table { min-width: 100%; border-collapse: collapse; font-size: 14px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
        </style>
        </head>
        <body>
        \(html)
        <script>
            var tables = document.querySelectorAll("table");
            tables.forEach(function(table) {
                var wrapper = document.createElement("div");
                wrapper.className = "table-wrapper";
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            });
        </script>
        </body>
        </html>
        """
        uiView.loadHTMLString(styledHtml, baseURL: nil)
    }
}
