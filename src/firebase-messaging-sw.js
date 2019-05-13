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

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(payload) {
  console.info(
    "[firebase-messaging-sw.js] Received background messages",
    payload
  );

  var notificationTitle = "Notification";
  var notificationOptions = {
    body: payload.message ? payload.message : "No message",
    icon: location.origin + "/assets/firebase-logo.png"
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});
