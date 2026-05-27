import Foundation
import SwiftUI

enum L10n {
    static func string(_ key: String, defaultValue: String) -> String {
        NSLocalizedString(key, tableName: nil, bundle: .main, value: defaultValue, comment: "")
    }

    static func format(_ key: String, defaultValue: String, _ arguments: CVarArg...) -> String {
        String(
            format: string(key, defaultValue: defaultValue),
            locale: Locale.current,
            arguments: arguments
        )
    }
}

extension Text {
    init(l10n key: String, defaultValue: String) {
        self.init(L10n.string(key, defaultValue: defaultValue))
    }
}
