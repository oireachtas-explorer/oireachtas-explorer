import Foundation

struct SpeechSegment: Identifiable {
    let id = UUID()
    let speakerId: String
    let speakerName: String
    let memberUri: String?
    var paragraphs: [String]
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

final class TranscriptAPI {
    static let shared = TranscriptAPI()
    
    func fetchTranscript(xmlUri: String, debateSectionUri: String) async throws -> [SpeechSegment] {
        guard let url = URL(string: xmlUri) else { throw TranscriptError.invalidURL }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        
        let targetEid = debateSectionUri.components(separatedBy: "/").last ?? ""
        let parser = TranscriptXMLParser(targetEid: targetEid)
        return try parser.parse(data: data)
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
            }
        } else if inTargetSection, currentSpeakerId != nil, elementName == "p" {
            currentText = ""
        }
    }
    
    func parser(_ parser: XMLParser, foundCharacters string: String) {
        if inTargetSection, currentSpeakerId != nil {
            currentText += string
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
                } else {
                    segments.append(SpeechSegment(speakerId: sid, speakerName: name, memberUri: uri, paragraphs: currentParagraphs))
                }
            }
            currentSpeakerId = nil
            currentParagraphs = []
        } else if inTargetSection, currentSpeakerId != nil, elementName == "p" {
            let p = currentText.trimmingCharacters(in: .whitespacesAndNewlines)
            if !p.isEmpty {
                currentParagraphs.append(p)
            }
            currentText = ""
        }
        
        currentDepth -= 1
    }
    
    func parser(_ parser: XMLParser, parseErrorOccurred parseError: Error) {
        self.parseError = parseError
    }
}
