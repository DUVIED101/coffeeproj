import UIKit
import React
import React_RCTAppDelegate

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    self.moduleName = "coffeeproj"
    self.initialProps = [:]

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // Always use local bundle to avoid Metro connection issues
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
  }
}
