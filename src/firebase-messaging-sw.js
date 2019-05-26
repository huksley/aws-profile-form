/**
 * Standalone, barebones, minimal service workers Javascript
 *
 * NOTE: This file is never compiled by Webpack,
 * It just copied verbatim (except process.env replacements) to the
 * dist folder.
 */
importScripts(location.origin + "/worker/firebaseApp.js");
importScripts(location.origin + "/worker/firebaseMessaging.js");

firebase.initializeApp({
  messagingSenderId: process.env.FCM_MESSAGING_SENDERID
});

const showNotification = false;

const messaging = firebase.messaging();

/**
 * https://serviceworke.rs/immediate-claim.html
 */
self.addEventListener("install", event => {
  console.info("Service worker - install");
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  console.info("Service worker - activate");
  event.waitUntil(self.clients.claim());
});

messaging.setBackgroundMessageHandler(function(payload) {
  console.info("Received background message", payload);

  clients
    .matchAll({ includeUncontrolled: true, type: "window" })
    .then(clients =>
      clients.forEach(client => {
        console.info("Sending background message to client", client);
        return client.postMessage(payload.data);
      })
    );

  // We MUST show notification or Google FCM will generate some default one 
  // (This site has been updated in the background)
  const notificationTitle = "Notification";
  const notificationOptions = {
    body: payload.message
      ? payload.message
      : payload.data && payload.data.message
      ? payload.data.message
      : "No message",
    icon: location.origin + "/assets/firebase-logo.png"
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});
