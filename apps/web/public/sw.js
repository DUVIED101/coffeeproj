/* BystroBarista service worker — Web Push delivery only (no offline caching).
   Payload contract comes from supabase/functions/send-push: { title, body,
   kind, tag, data }. Clicks route through /push, which maps kind+data to the
   right screen with the signed-in user's role in hand. */

var DEFAULT_TITLE = "БыстроБариста";
var ICON = "/icons/icon-192.png";
var ACTION_LABELS = {
  ru: { accept: "Интересно", decline: "Неинтересно" },
  en: { accept: "Interested", decline: "Not interested" },
};

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { body: event.data ? event.data.text() : "" };
  }
  var lang =
    String(self.navigator.language || "ru").slice(0, 2) === "en" ? "en" : "ru";
  var options = {
    body: payload.body || "",
    icon: ICON,
    badge: ICON,
    data: payload.data || {},
    // Same collapse semantics as apns-collapse-id: a chat burst shows as one tile.
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    actions:
      payload.kind === "job_offer_received"
        ? [
            { action: "accept", title: ACTION_LABELS[lang].accept },
            { action: "decline", title: ACTION_LABELS[lang].decline },
          ]
        : [],
  };
  event.waitUntil(
    self.registration.showNotification(payload.title || DEFAULT_TITLE, options),
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var params = new URLSearchParams();
  Object.keys(data).forEach(function (key) {
    if (typeof data[key] === "string" && data[key]) params.set(key, data[key]);
  });
  if (event.action === "accept") params.set("action", "accepted");
  if (event.action === "decline") params.set("action", "declined");
  var url = "/push?" + params.toString();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clients) {
        var client = clients.find(function (c) {
          return "focus" in c;
        });
        if (client) {
          return client.focus().then(function () {
            client.postMessage({ type: "PUSH_ROUTE", url: url });
          });
        }
        return self.clients.openWindow(url);
      }),
  );
});
