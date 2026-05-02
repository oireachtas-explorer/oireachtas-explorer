import Foundation

struct SpeechSegment: Identifiable {
    let id = UUID()
    let speakerId: String
    let speakerName: String
    let memberUri: String?
    var paragraphs: [String]
    var htmlContent: String?
}

enum TranscriptError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case parseError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid transcript URL"
        case .networkError(let e): return "Failed to download transcript: \(e.localizedDescription)"
        case .parseError: return "Failed to parse transcript data"
        }
    }
}

actor TranscriptAPI {
    static let shared = TranscriptAPI()
    private var cache: [String: [SpeechSegment]] = [:]
    private var cacheOrder: [String] = []
    private var inFlight: [String: Task<[SpeechSegment], Error>] = [:]
    private let cacheLimit = 30
    
    func fetchTranscript(xmlUri: String, debateSectionUri: String) async throws -> [SpeechSegment] {
        let cacheKey = "\(xmlUri)#\(debateSectionUri)"
        if let cached = cache[cacheKey] { return cached }
        if let task = inFlight[cacheKey] { return try await task.value }

        let task = Task<[SpeechSegment], Error> {
            guard let url = URL(string: xmlUri) else { throw TranscriptError.invalidURL }
            let (data, _) = try await URLSession.shared.data(from: url)
            let targetEid = debateSectionUri.components(separatedBy: "/").last ?? ""
            let parser = TranscriptXMLParser(targetEid: targetEid)
            return try parser.parse(data: data)
        }
        inFlight[cacheKey] = task

        do {
            let segments = try await task.value
            remember(segments, for: cacheKey)
            inFlight[cacheKey] = nil
            return segments
        } catch {
            inFlight[cacheKey] = nil
            throw error
        }
    }

    private func remember(_ segments: [SpeechSegment], for key: String) {
        cache[key] = segments
        cacheOrder.removeAll { $0 == key }
        cacheOrder.append(key)
        while cacheOrder.count > cacheLimit {
            let evicted = cacheOrder.removeFirst()
            cache[evicted] = nil
        }
    }
}

class TranscriptXMLParser: NSObject, XMLParserDelegate {
    private let targetEid: String
    
    private var segments: [SpeechSegment] = []
    private var speakers: [String: (name: String, uri: String?)] = [:]
    
    private var currentDepth = 0
    private var targetDepth = -1
    private var inTargetSection: Bool { targetDepth != -1 }
    
    private var currentSpeakerId: String?
    private var currentParagraphs: [String] = []
    private var currentHtml: String = ""
    private var currentText = ""
    
    private var parseError: Error?
    
    init(targetEid: String) {
        self.targetEid = targetEid
    }
    
    func parse(data: Data) throws -> [SpeechSegment] {
        let xmlParser = XMLParser(data: data)
        xmlParser.delegate = self
        if !xmlParser.parse() {
            throw parseError ?? TranscriptError.parseError
        }
        return segments
    }
    
    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String : String] = [:]) {
        currentDepth += 1
        
        if elementName.contains("TLCPerson") {
            if let eId = attributeDict["eId"] {
                let name = attributeDict["showAs"] ?? eId.replacingOccurrences(of: "_", with: " ")
                let href = attributeDict["href"]
                let uri = href != nil ? "https://data.oireachtas.ie\(href!)" : nil
                speakers[eId] = (name, uri)
            }
        } else if elementName.contains("debateSection") {
            if attributeDict["eId"] == targetEid {
                targetDepth = currentDepth
            }
        } else if inTargetSection, elementName.contains("speech") {
            if let by = attributeDict["by"] {
                currentSpeakerId = by.replacingOccurrences(of: "#", with: "")
                currentParagraphs = []
                currentHtml = ""
            }
        } else if inTargetSection, currentSpeakerId != nil {
            var tag = "<\(elementName)"
            for (k, v) in attributeDict {
                let escapedV = v.replacingOccurrences(of: "\"", with: "&quot;")
                tag += " \(k)=\"\(escapedV)\""
            }
            tag += ">"
            currentHtml += tag
            
            if elementName == "p" {
                currentText = ""
            }
        }
    }
    
    func parser(_ parser: XMLParser, foundCharacters string: String) {
        if inTargetSection, currentSpeakerId != nil {
            currentText += string
            currentHtml += string.replacingOccurrences(of: "&", with: "&amp;")
                                 .replacingOccurrences(of: "<", with: "&lt;")
                                 .replacingOccurrences(of: ">", with: "&gt;")
        }
    }
    
    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName qName: String?) {
        if elementName.contains("debateSection") {
            if currentDepth == targetDepth {
                targetDepth = -1
            }
        } else if inTargetSection, elementName.contains("speech") {
            if let sid = currentSpeakerId {
                let name = speakers[sid]?.name ?? sid
                let uri = speakers[sid]?.uri
                
                if let last = segments.last, last.speakerId == sid {
                    segments[segments.count - 1].paragraphs.append(contentsOf: currentParagraphs)
                    segments[segments.count - 1].htmlContent = (segments[segments.count - 1].htmlContent ?? "") + currentHtml
                } else {
                    segments.append(SpeechSegment(speakerId: sid, speakerName: name, memberUri: uri, paragraphs: currentParagraphs, htmlContent: currentHtml))
                }
            }
            currentSpeakerId = nil
            currentParagraphs = []
            currentHtml = ""
        } else if inTargetSection, currentSpeakerId != nil {
            currentHtml += "</\(elementName)>"
            if elementName == "p" {
                let p = currentText.trimmingCharacters(in: .whitespacesAndNewlines)
                if !p.isEmpty {
                    currentParagraphs.append(p)
                }
                currentText = ""
            }
        }
        
        currentDepth -= 1
    }
    
    func parser(_ parser: XMLParser, parseErrorOccurred parseError: Error) {
        self.parseError = parseError
    }
}
