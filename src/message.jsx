import * as firebase from "firebase/app";
import "firebase/messaging";
import * as R from "ramda";

firebase.initializeApp({
  apiKey: process.env.FCM_APIKEY,
  authDomain: "find-faces.firebaseapp.com",
  databaseURL: "https://find-faces.firebaseio.com",
  projectId: "find-faces",
  storageBucket: "find-faces.appspot.com",
  messagingSenderId: process.env.FCM_MESSAGING_SENDERID,
  appId: process.env.FCM_APPID
});

const messaging = firebase.messaging();
messaging.usePublicVapidKey(process.env.FCM_VAPID_KEY);

const msgPath = process.env.API_MESSAGING_URL;

messaging
  .requestPermission()
  .then(function() {
    console.info("Notification permission granted.");
    messaging
      .getToken()
      .then(function(currentToken) {
        if (currentToken) {
          console.info("Got token", currentToken);
          token = currentToken;
          registerUser(currentToken);
        } else {
          console.info("No Instance ID token available.");
        }
      })
      .catch(function(err) {
        console.warn("An error occurred while retrieving token. ", err);
      });
  })
  .catch(function(err) {
    console.warn("Unable to get permission to notify.", err);
    alert("Failed to request permissions, please allow notifications.");
  });

let userId = null;
let token = null;

function registerUser(token) {
  fetch(msgPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      event: "register",
      userId: null,
      token,
      fields: {
        userAgent:
          navigator.doNotTrack !== "0" ? navigator.userAgent : "do-not-track",
        language: navigator.language
      }
    })
  })
    .then(response => {
      if (response.status !== 200) {
        throw new Error(response.status + " " + response.statusText);
      } else {
        return response;
      }
    })
    .then(response => response.json())
    .then(r => {
      console.info("User registered, userId: " + r.userId);
      userId = r.userId;
      registrationHandlers.forEach(f => f(userId, token, r));
    })
    .catch(err => {
      console.warn("Failed to register user", err);
    });
}

function unregisterUser() {
  fetch(msgPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      event: "unregister",
      userId,
      token
    })
  })
    .then(response => {
      if (response.status !== 200) {
        throw new Error(response.status + " " + response.statusText);
      } else {
        return response;
      }
    })
    .then(response => response.json())
    .then(r => {
      console.info("User unregistered");
    })
    .catch(err => {
      console.warn("Failed to unregister user", err);
    });
}

messaging.onTokenRefresh(function() {
  messaging
    .getToken()
    .then(function(refreshedToken) {
      console.info("Token refreshed", refreshedToken);
      token = refreshedToken;
      registerUser(currentToken);
    })
    .catch(function(err) {
      console.warn("Unable to retrieve refreshed token ", err);
    });
});

// Handle Google FCM incoming messages. Called when:
// - a message is received while the app has focus
// - the user clicks on an app notification created by a service worker
//   `messaging.setBackgroundMessageHandler` handler.
messaging.onMessage(function(payload) {
  console.info("Message received", payload);
  handleIncomingMessage(payload);
});

const sendToHandlers = data => {
  handlers.forEach(handler => {
    try {
      handler(data);
    } catch (e) {
      console.warn("Failed to send message to handler " + handler, msg);
    }
  });
};

const handleIncomingMessage = msg => {
  sendToHandlers(msg.data);
};

let handlers = [];
let registrationHandlers = [];

if ("serviceWorker" in navigator) {
  // Handler for messages coming from the service worker
  navigator.serviceWorker.addEventListener("message", function(event) {
    console.info("Client received message", event);
    handleIncomingMessage(event);
  });
}

export function subscribeMessageHandler(handler, registrationHandler) {
  console.info("Adding subscription for messages");
  handlers[handlers.length] = handler;
  registrationHandlers[registrationHandlers.length] = registrationHandler;
}

export function unsubscribeMessageHandler(handler, registrationHandler) {
  console.info("Removing subscription for messages");
  handlers = R.reject(f => f === handler);
  registrationHandlers = R.reject(f => f === registrationHandler);
}

window.onunload = function() {
  if (userId) {
    unregisterUser();
  }
};
