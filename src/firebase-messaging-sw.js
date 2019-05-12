/**
 * Standalone, barebones, minimal service workers Javascript
 */

importScripts(location.origin + "/worker/firebaseApp.js");
importScripts(location.origin + "/worker/firebaseMessaging.js");
/*
importScripts('https://www.gstatic.com/firebasejs/6.0.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/6.0.2/firebase-messaging.js');
*/

firebase.initializeApp({
  messagingSenderId: process.env.FCM_MESSAGING_SENDERID
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(payload) {
  console.info(
    "[firebase-messaging-sw.js] Received background message ",
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
