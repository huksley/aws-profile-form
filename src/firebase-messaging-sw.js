/**
 * Standalone, barebones, minimal service workers Javascript
 *
 * WARNING: This file is never compiled by Webpack,
 * It just copied verbatim (except process.env replacements) to the
 * dist folder.
 */

/* eslint no-restricted-globals: "warn" */
const worker = self;

importScripts(`${worker.location.origin}/worker/firebaseApp.js`);
importScripts(`${worker.location.origin}/worker/firebaseMessaging.js`);

/* eslint no-undef: "warn" */
firebase.initializeApp({
  messagingSenderId: process.env.FCM_MESSAGING_SENDERID,
});

const appVersion = process.env.CODE_VERSION;
const messaging = firebase.messaging();

/**
 * https://serviceworke.rs/immediate-claim.html
 */
worker.addEventListener('install', (event) => {
  console.info(`Service worker - install ${appVersion}`);
  event.waitUntil(worker.skipWaiting());
});

worker.addEventListener('activate', (event) => {
  console.info(`Service worker - activate ${appVersion}`);
  event.waitUntil(worker.clients.claim());
});

const shortId = (userId) => (userId && userId.indexOf('-')
  ? userId.substring(0, userId.indexOf('-'))
  : userId);

/**
 * Handle incoming background (tab not in focus) message
 */
messaging.setBackgroundMessageHandler((payload) => {
  console.info('Received background message', JSON.stringify(payload));

  /**
   * Deliver it to active browser tab.
   * As one service worker might be handling multiple tabs, iterate and deliver to each window.
   */
  worker.clients
    .matchAll({ includeUncontrolled: true, type: 'window' })
    .then((clients) => clients.forEach((client) => {
      console.info('Sending background message to client', client);
      return client.postMessage(payload.data);
    }));

  try {
    const notificationTitle = `${appVersion} FindFace${
      payload.data && payload.data.code ? ` ${payload.data.code}` : ''
    }`;
    const notificationOptions = {
      body:
        (payload.data && payload.data.message
          ? payload.data.message
          : payload.message
            ? payload.message
            : 'No message')
        + (payload.data && payload.data.userId
          ? ` ${shortId(payload.data.userId)}`
          : ''),
      icon: `${location.origin}/assets/firebase-logo.png`,
      silent: true,
    };

    /**
     * We MUST show notification or Google FCM will generate some default one
     * (This site has been updated in the background)
     */
    console.info(`Show notification ${notificationTitle}`);
    return worker.registration.showNotification(
      notificationTitle,
      notificationOptions,
    );
  } catch (e) {
    console.warn(`Failed to show notification: ${e.message}`, e);
    return null;
  }
});
