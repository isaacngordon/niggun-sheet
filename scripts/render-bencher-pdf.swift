import Foundation
import PDFKit

let arguments = CommandLine.arguments
guard arguments.count == 4 else {
    fputs("Usage: swift scripts/render-bencher-pdf.swift <input.pdf> <output-directory> <output-prefix>\n", stderr)
    exit(1)
}

let inputURL = URL(fileURLWithPath: arguments[1], relativeTo: URL(fileURLWithPath: FileManager.default.currentDirectoryPath))
let outputDirectoryURL = URL(fileURLWithPath: arguments[2], relativeTo: URL(fileURLWithPath: FileManager.default.currentDirectoryPath))
let outputPrefix = arguments[3]
let fileManager = FileManager.default

do {
    try fileManager.createDirectory(at: outputDirectoryURL, withIntermediateDirectories: true)

    guard let document = PDFDocument(url: inputURL) else {
        throw NSError(domain: "BencherPDF", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unable to open PDF at \(inputURL.path)"])
    }

    let pageCount = document.pageCount
    guard pageCount > 0 else {
        throw NSError(domain: "BencherPDF", code: 2, userInfo: [NSLocalizedDescriptionKey: "PDF has no pages"])
    }

    for pageNumber in 1...pageCount {
        let outputBaseURL = outputDirectoryURL.appendingPathComponent("\(outputPrefix)-p\(pageNumber)")
        let outputSVGURL = outputDirectoryURL.appendingPathComponent("\(outputPrefix)-p\(pageNumber).svg")

        if fileManager.fileExists(atPath: outputBaseURL.path) {
            try fileManager.removeItem(at: outputBaseURL)
        }
        if fileManager.fileExists(atPath: outputSVGURL.path) {
            try fileManager.removeItem(at: outputSVGURL)
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/pdftocairo")
        process.arguments = [
            "-svg",
            "-f", String(pageNumber),
            "-l", String(pageNumber),
            inputURL.path,
            outputBaseURL.path,
        ]

        try process.run()
        process.waitUntilExit()

        guard process.terminationStatus == 0 else {
            throw NSError(domain: "BencherPDF", code: 3, userInfo: [NSLocalizedDescriptionKey: "pdftocairo failed for page \(pageNumber)"])
        }

        if fileManager.fileExists(atPath: outputBaseURL.path) {
            try fileManager.moveItem(at: outputBaseURL, to: outputSVGURL)
        }

        guard fileManager.fileExists(atPath: outputSVGURL.path) else {
            throw NSError(domain: "BencherPDF", code: 4, userInfo: [NSLocalizedDescriptionKey: "Missing SVG output for page \(pageNumber)"])
        }

        print("Wrote \(outputSVGURL.path)")
    }
} catch {
    fputs("\(error.localizedDescription)\n", stderr)
    exit(1)
}
