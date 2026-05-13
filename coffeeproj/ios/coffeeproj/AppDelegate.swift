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

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    RNCPushNotificationIOS.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
  }

  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    RNCPushNotificationIOS.didFailToRegisterForRemoteNotificationsWithError(error)
  }

  override func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    RNCPushNotificationIOS.didReceiveRemoteNotification(userInfo, fetchCompletionHandler: completionHandler)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // Try Metro first, fall back to bundle
    let metroURL = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    if let url = metroURL, isMetroAvailable(url) {
      return url
    }
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
  }

  private func isMetroAvailable(_ url: URL) -> Bool {
    // Check if Metro is running
    guard let statusURL = URL(string: "http://localhost:8081/status") else {
      return false
    }

    let semaphore = DispatchSemaphore(value: 0)
    var metroAvailable = false

    let task = URLSession.shared.dataTask(with: statusURL) { data, response, error in
      metroAvailable = (error == nil)
      semaphore.signal()
    }
    task.resume()

    // Wait up to 100ms for response
    _ = semaphore.wait(timeout: .now() + 0.1)
    return metroAvailable
  }
}
