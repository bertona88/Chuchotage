import Foundation

struct TranslationLanguage: Identifiable, Equatable, Sendable {
    let code: String
    let nameKey: String
    let defaultName: String

    var id: String { code }

    var name: String {
        L10n.string(nameKey, defaultValue: defaultName)
    }
}

enum TranslationLanguages {
    static let fallbackTargetLanguageCode = "en"
    static var defaultTargetLanguageCode: String {
        preferredSupportedLanguageCode(from: Locale.preferredLanguages) ?? fallbackTargetLanguageCode
    }

    static let supportedOutputLanguages: [TranslationLanguage] = [
        TranslationLanguage(code: "es", nameKey: "language.es", defaultName: "Spanish"),
        TranslationLanguage(code: "pt", nameKey: "language.pt", defaultName: "Portuguese"),
        TranslationLanguage(code: "fr", nameKey: "language.fr", defaultName: "French"),
        TranslationLanguage(code: "ja", nameKey: "language.ja", defaultName: "Japanese"),
        TranslationLanguage(code: "ru", nameKey: "language.ru", defaultName: "Russian"),
        TranslationLanguage(code: "zh", nameKey: "language.zh", defaultName: "Chinese"),
        TranslationLanguage(code: "de", nameKey: "language.de", defaultName: "German"),
        TranslationLanguage(code: "ko", nameKey: "language.ko", defaultName: "Korean"),
        TranslationLanguage(code: "hi", nameKey: "language.hi", defaultName: "Hindi"),
        TranslationLanguage(code: "id", nameKey: "language.id", defaultName: "Indonesian"),
        TranslationLanguage(code: "vi", nameKey: "language.vi", defaultName: "Vietnamese"),
        TranslationLanguage(code: "it", nameKey: "language.it", defaultName: "Italian"),
        TranslationLanguage(code: "en", nameKey: "language.en", defaultName: "English"),
    ]

    static func outputLanguage(for code: String?) -> TranslationLanguage {
        supportedOutputLanguages.first { $0.code == code }
            ?? outputLanguage(for: defaultTargetLanguageCode)
    }

    static func sanitizeOutputLanguageCode(_ code: String?) -> String {
        outputLanguage(for: code).code
    }

    static func preferredSupportedLanguageCode(from preferredLanguages: [String]) -> String? {
        for identifier in preferredLanguages {
            let normalized = normalizeLanguageCode(identifier)
            if supportedOutputLanguages.contains(where: { $0.code == normalized }) {
                return normalized
            }
        }
        return nil
    }

    private static func normalizeLanguageCode(_ identifier: String) -> String {
        identifier
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .split(whereSeparator: { $0 == "-" || $0 == "_" })
            .first
            .map(String.init) ?? ""
    }
}
