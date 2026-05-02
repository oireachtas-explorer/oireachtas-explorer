import SwiftUI
import ImageIO

// MARK: - Avatar

struct AvatarView: View {
    let member: Member
    var size: CGFloat = 56

    var body: some View {
        ZStack {
            Circle().fill(partyColor(member.party))
            CachedAsyncImage(url: URL(string: member.photoUrl), maxPixelSize: size * UIScreen.main.scale) {
                Text(member.initials)
                    .font(.system(size: size * 0.3, weight: .semibold, design: .serif))
                    .foregroundColor(.white)
            }
            .clipShape(Circle())
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }
}

// MARK: - Cached image view
//
// AsyncImage doesn't cache decoded bitmaps — scrolling a 50-member grid up
// and down would refetch every photo. NSCache holds decoded UIImages keyed
// by URL and evicts under memory pressure.

private let imageCache: NSCache<NSURL, UIImage> = {
    let c = NSCache<NSURL, UIImage>()
    c.countLimit = 300
    c.totalCostLimit = 30 * 1024 * 1024  // 30MB of decoded bitmaps
    return c
}()

struct CachedAsyncImage<Placeholder: View>: View {
    let url: URL?
    let maxPixelSize: CGFloat
    let placeholder: () -> Placeholder

    @State private var image: UIImage?

    init(url: URL?, maxPixelSize: CGFloat, @ViewBuilder placeholder: @escaping () -> Placeholder) {
        self.url = url
        self.maxPixelSize = maxPixelSize
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                placeholder()
            }
        }
        .task(id: url) { await load() }
    }

    private func load() async {
        guard let url else {
            await MainActor.run { image = nil }
            return
        }
        if let cached = imageCache.object(forKey: url as NSURL) {
            await MainActor.run { self.image = cached }
            return
        }
        await MainActor.run { self.image = nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let img = await Task.detached(priority: .utility, operation: {
                downsampleImage(data: data, maxPixelSize: maxPixelSize)
            }).value else { return }
            let cost = img.cgImage.map { $0.bytesPerRow * $0.height } ?? data.count
            imageCache.setObject(img, forKey: url as NSURL, cost: cost)
            guard !Task.isCancelled else { return }
            await MainActor.run { self.image = img }
        } catch {
            // Silently fall through to placeholder.
        }
    }
}

private func downsampleImage(data: Data, maxPixelSize: CGFloat) -> UIImage? {
    let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions) else {
        return UIImage(data: data)
    }

    let options = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceThumbnailMaxPixelSize: max(1, Int(maxPixelSize))
    ] as CFDictionary

    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else {
        return UIImage(data: data)
    }
    return UIImage(cgImage: cgImage)
}

#Preview {
    let m = Member(
        id: "test", uri: "", memberCode: "test",
        fullName: "Séan Ó Briain", firstName: "Séan", lastName: "Ó Briain",
        party: "Fianna Fáil", constituency: "Dublin Bay North", constituencyCode: "DBN",
        photoUrl: "", offices: [], committees: []
    )
    return AvatarView(member: m, size: 80).padding()
}
