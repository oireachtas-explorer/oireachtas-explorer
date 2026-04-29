import SwiftUI

struct MemberProfileLoaderView: View {
    let memberUri: String
    
    @State private var member: Member?
    @State private var isLoading = true
    @State private var error: String?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        Group {
            if let member = member {
                MemberProfileView(member: member)
            } else {
                VStack(spacing: 0) {
                    header
                    Spacer()
                    if isLoading {
                        LoadingView()
                    } else if let err = error {
                        ErrorBanner(message: err)
                    } else {
                        Text("Member not found.")
                            .font(.inter(size: 15))
                            .foregroundColor(Color.mutedText)
                    }
                    Spacer()
                }
                .background(Color.cream)
            }
        }
        .navigationBarHidden(true)
        .task {
            guard member == nil else { return }
            isLoading = true
            error = nil
            do {
                let members = try await OireachtasAPI.shared.getMembers(memberUri: memberUri)
                if let fetched = members.first {
                    self.member = fetched
                } else {
                    self.error = "Could not locate member details."
                }
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
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
            
            Text("Loading Profile...")
                .font(.dmSerif(size: 18))
                .foregroundColor(.white)
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color.forestGreen)
    }
}
