import SwiftUI

@MainActor
final class DebateTranscriptViewModel: ObservableObject {
    @Published var segments: [SpeechSegment] = []
    @Published var isLoading = false
    @Published var error: String?
    
    func load(xmlUri: String, debateSectionUri: String, focusMemberUri: String?) async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        
        do {
            segments = try await TranscriptAPI.shared.fetchTranscript(xmlUri: xmlUri, debateSectionUri: debateSectionUri)
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
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
                    // Extract unique speakers
                    let uniqueSpeakers = Array(Set(vm.segments.map(\.speakerName))).sorted()
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Participants")
                            .font(.inter(size: 12, weight: .bold))
                            .foregroundColor(Color.mutedText)
                            .tracking(0.5)
                            .textCase(.uppercase)
                        
                        Text(uniqueSpeakers.joined(separator: ", "))
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
                
                ForEach(segment.paragraphs, id: \.self) { paragraph in
                    Text(paragraph)
                        .font(.inter(size: 15))
                        .foregroundColor(Color.bodyText)
                        .lineSpacing(4)
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
