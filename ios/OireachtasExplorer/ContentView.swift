import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
            MembersView()
                .tabItem {
                    Label("Members", systemImage: "person.2.fill")
                }
            DebatesView()
                .tabItem {
                    Label("Debates", systemImage: "bubble.left.and.bubble.right.fill")
                }
            AboutView()
                .tabItem {
                    Label("About", systemImage: "info.circle.fill")
                }
        }
        .tint(Color.darkGreen)
        .background(Color.cream)
    }
}

#Preview {
    ContentView()
}
