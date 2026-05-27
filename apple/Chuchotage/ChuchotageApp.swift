import SwiftUI

@main
struct ChuchotageApp: App {
    @StateObject private var viewModel: TranslationViewModel

    init() {
        _viewModel = StateObject(wrappedValue: AppleAppDependencies.makeTranslationViewModel())
    }

    var body: some Scene {
        WindowGroup {
            AppRootView(viewModel: viewModel)
                #if os(macOS)
                .frame(
                    minWidth: 340,
                    idealWidth: 360,
                    maxWidth: 390,
                    minHeight: 604,
                    idealHeight: 640,
                    maxHeight: 694
                )
                #endif
        }
        #if os(macOS)
        .defaultSize(width: 360, height: 640)
        .windowResizability(.contentSize)
        #endif
    }
}
