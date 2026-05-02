import Foundation

let url = URL(string: "https://data.oireachtas.ie/ie/oireachtas/debateRecord/dail/2024-04-18/debate/mul@/main.xml")!
let (data, _) = try await URLSession.shared.data(from: url)
let xmlString = String(data: data, encoding: .utf8)!
print(String(xmlString.prefix(1000)))
