import SwiftUI

struct AboutView: View {
    @State private var safariURL: URL?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Logo & Version
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.forestGreen)
                                .frame(width: 80, height: 80)
                            Image(systemName: "building.columns.fill")
                                .font(.system(size: 36))
                                .foregroundColor(.white)
                        }
                        .padding(.top, 20)
                        
                        Text("Oireachtas Explorer")
                            .font(.dmSerif(size: 28))
                            .foregroundColor(Color.headingText)
                        
                        Text("Version 1.0.0 (34th Dáil Edition)")
                            .font(.inter(size: 14, weight: .medium))
                            .foregroundColor(Color.mutedText)
                    }
                    
                    // Main Content
                    VStack(alignment: .leading, spacing: 20) {
                        aboutSection(
                            title: "About the Project",
                            body: "Oireachtas Explorer is an open-source tool designed to make Irish parliamentary data accessible to everyone. Track your TDs, research debates, and stay informed on legislation."
                        )
                        
                        aboutSection(
                            title: "Data Source",
                            body: "All data is sourced live from the Oireachtas Open Data API. This app is not an official government publication."
                        )
                        
                        // Links
                        VStack(spacing: 12) {
                            LinkButton(title: "Privacy Policy", icon: "shield.fill") {
                                safariURL = URL(string: "https://oireachtas-explorer.github.io/oireachtas-explorer/privacy.html")
                            }
                            
                            LinkButton(title: "Source Code", icon: "code.branch") {
                                safariURL = URL(string: "https://github.com/oireachtas-explorer/oireachtas-explorer")
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    Spacer(minLength: 40)
                    
                    // Footer
                    Text("© 2026 Oireachtas Explorer Contributors\nReleased under the MIT License")
                        .font(.inter(size: 12))
                        .foregroundColor(Color.mutedText)
                        .multilineTextAlignment(.center)
                        .padding(.bottom, 20)
                }
            }
            .background(Color.cream)
            .navigationTitle("About")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("About").font(.dmSerif(size: 18))
                }
            }
            .sheet(item: $safariURL) { url in
                SafariView(url: url).ignoresSafeArea()
            }
        }
    }
    
    private func aboutSection(title: String, body: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.inter(size: 14, weight: .bold))
                .foregroundColor(Color.darkGreen)
                .tracking(0.5)
            
            Text(body)
                .font(.inter(size: 15))
                .foregroundColor(Color.bodyText)
                .lineSpacing(4)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
    }
}

struct LinkButton: View {
    let title: String
    let icon: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                Text(title)
                    .font(.inter(size: 15, weight: .semibold))
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 12, weight: .bold))
                    .opacity(0.5)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.white)
            .foregroundColor(Color.headingText)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.cardBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    AboutView()
}
