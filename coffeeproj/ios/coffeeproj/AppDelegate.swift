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

    // Register all interactive notification categories in a single call.
    // Calling setNotificationCategories twice would overwrite the first set,
    // so all categories must be registered together.
    registerNotificationCategories()

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

  private func registerNotificationCategories() {
    // JOB_OFFER — Интересно / Неинтересно
    let jobOfferAccept = UNNotificationAction(
      identifier: "JOB_OFFER_ACCEPT",
      title: NSLocalizedString("notification.jobOffer.accept", comment: ""),
      options: []
    )
    let jobOfferDecline = UNNotificationAction(
      identifier: "JOB_OFFER_DECLINE",
      title: NSLocalizedString("notification.jobOffer.decline", comment: ""),
      options: [.destructive]
    )
    let jobOffer = UNNotificationCategory(
      identifier: "JOB_OFFER",
      actions: [jobOfferAccept, jobOfferDecline],
      intentIdentifiers: [],
      options: []
    )

    // SHIFT_CONFIRMATION — Да / Нет (barista confirms or declines shift)
    let shiftConfirm = UNNotificationAction(
      identifier: "SHIFT_CONFIRMATION_CONFIRM",
      title: NSLocalizedString("notification.shiftConfirmation.confirm", comment: ""),
      options: []
    )
    let shiftDecline = UNNotificationAction(
      identifier: "SHIFT_CONFIRMATION_DECLINE",
      title: NSLocalizedString("notification.shiftConfirmation.decline", comment: ""),
      options: [.destructive]
    )
    let shiftConfirmation = UNNotificationCategory(
      identifier: "SHIFT_CONFIRMATION",
      actions: [shiftConfirm, shiftDecline],
      intentIdentifiers: [],
      options: []
    )

    // SHIFT_ALERT — Отменить смену (business sees T-1h no-response alert)
    let shiftAlertCancel = UNNotificationAction(
      identifier: "SHIFT_ALERT_CANCEL",
      title: NSLocalizedString("notification.shiftAlert.cancel", comment: ""),
      options: [.foreground, .destructive]
    )
    let shiftAlert = UNNotificationCategory(
      identifier: "SHIFT_ALERT",
      actions: [shiftAlertCancel],
      intentIdentifiers: [],
      options: []
    )

    UNUserNotificationCenter.current().setNotificationCategories([jobOffer, shiftConfirmation, shiftAlert])
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

  // Foreground presentation: by default we suppress the iOS native banner so
  // our custom InAppToast (driven by Supabase Realtime on the notifications
  // table) owns the foreground UX. Shift-related reminders (T-24h, T-3h, T-1h,
  // confirmation requests, cancellations) are time-critical and override this
  // — they show as banner + sound even when the user is inside the app.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let kind = notification.request.content.userInfo["kind"] as? String ?? ""
    if kind.hasPrefix("shift_") {
      completionHandler([.banner, .sound, .badge, .list])
    } else {
      completionHandler([.badge, .list])
    }
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
