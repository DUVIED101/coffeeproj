import UIKit
import React
import React_RCTAppDelegate
import UserNotifications

@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate, RNAppAuthAuthorizationFlowManager {
  public weak var authorizationFlowManagerDelegate: RNAppAuthAuthorizationFlowManagerDelegate?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    self.moduleName = "coffeeproj"
    self.initialProps = [:]

    // Required for @react-native-community/push-notification-ios to forward
    // foreground presentation and tap events to JS via the 'notification' event.
    UNUserNotificationCenter.current().delegate = self

    // Register the JOB_OFFER category so the Интересно / Неинтересно action
    // buttons appear on job_offer_received notifications. Action options are
    // [] (no .foreground) so taps wake the app in the background and dispatch
    // the response via UNUserNotificationCenterDelegate without forcing a
    // foreground transition.
    registerJobOfferCategory()

    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)

    // Clear delivered notifications + badge whenever the app becomes active.
    // Routed through NotificationCenter (not an UIApplicationDelegate override)
    // because RCTAppDelegate doesn't declare applicationDidBecomeActive, so a
    // Swift `override` would never be invoked by UIKit's delegate dispatch.
    // We observe BOTH willEnterForeground and didBecomeActive so the clear
    // fires whether the user resumes via tap-icon or via app switcher.
    let nc = NotificationCenter.default
    nc.addObserver(
      self,
      selector: #selector(clearDeliveredNotifications),
      name: UIApplication.willEnterForegroundNotification,
      object: nil
    )
    nc.addObserver(
      self,
      selector: #selector(clearDeliveredNotifications),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )

    // Cover the cold-start case too — the observers above only fire on
    // resume, not on the first activation following didFinishLaunching.
    clearDeliveredNotifications()

    return result
  }

  private func registerJobOfferCategory() {
    let accept = UNNotificationAction(
      identifier: "JOB_OFFER_ACCEPT",
      title: "Интересно",
      options: []
    )
    let decline = UNNotificationAction(
      identifier: "JOB_OFFER_DECLINE",
      title: "Неинтересно",
      options: [.destructive]
    )
    let category = UNNotificationCategory(
      identifier: "JOB_OFFER",
      actions: [accept, decline],
      intentIdentifiers: [],
      options: []
    )
    UNUserNotificationCenter.current().setNotificationCategories([category])
  }

  @objc private func clearDeliveredNotifications() {
    let center = UNUserNotificationCenter.current()
    center.getDeliveredNotifications { delivered in
      let ids = delivered.map { $0.request.identifier }
      if !ids.isEmpty {
        center.removeDeliveredNotifications(withIdentifiers: ids)
      }
    }
    UIApplication.shared.applicationIconBadgeNumber = 0
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

  // Foreground presentation: suppress the iOS native banner so our custom
  // InAppToast (driven by Supabase Realtime on the notifications table) owns
  // the foreground UX. The badge is still updated so the app icon count stays
  // accurate, and the notification is added to Notification Center via .list.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.badge, .list])
  }

  // Notification tap: forwards the payload to JS so navigationRef can route.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    RNCPushNotificationIOS.didReceive(response)
    completionHandler()
  }


  // Handle OAuth redirects: react-native-app-auth (Yandex) + Google Sign-In.
  override func application(
    _ application: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if let delegate = authorizationFlowManagerDelegate,
       delegate.resumeExternalUserAgentFlow(with: url) {
      return true
    }
    if GIDSignIn.sharedInstance.handle(url) {
      return true
    }
    return super.application(application, open: url, options: options)
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
