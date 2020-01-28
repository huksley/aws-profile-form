import * as firebase from "firebase/app";
import * as uuidV4 from "uuid/v4";

/** Magically loads messaging into firebase namespace */
import "firebase/messaging";

// Fixed set of process.env.XXX constansts are preprocessed by webpack
const API_MESSAGING_URL = process.env.API_MESSAGING_URL;

class Messaging {
  start() {
    return this;
  }
  onMessage(message) {}
  onRegistration(userId, token, response) {}
  stop() {}
  requestNotifications(handler) {}

  disableNotifications() {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        console.info("Unregistering service worker", registration);
        registration.unregister();
        this.setState({ alertMessage: "Stopped. Reload or close tab." });
      }
    });
    return false;
  }

  poll() {
    return fetch(API_MESSAGING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: "messages",
        userId: this.userId
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
        if (r && r.response) {
          r.response.forEach(message => this.onMessage({ id: message.id, ...message.content }));
        }
      })
      .catch(err => {
        console.warn("Failed to receive messages", err);
      });
  }

  register(token) {
    return fetch(API_MESSAGING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: "register",
        userId: null,
        token: this.token,
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
        this.userId = r.userId;
        this.onRegistration(this.userId, this.token, r);
        return Promise.resolve();
      })
      .catch(err => {
        console.warn("Failed to register user", err);
      });
  }

  unregister() {
    fetch(API_MESSAGING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: "unregister",
        userId: this.userId,
        token: this.token
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
}

class FirebaseMessaging extends Messaging {
  start(options) {
    Object.keys(options || {}).forEach(name => (this[name] = options[name]));
    firebase.initializeApp({
      apiKey: process.env.FCM_APIKEY,
      authDomain: "find-faces.firebaseapp.com",
      databaseURL: "https://find-faces.firebaseio.com",
      projectId: "find-faces",
      storageBucket: "find-faces.appspot.com",
      messagingSenderId: process.env.FCM_MESSAGING_SENDERID,
      appId: process.env.FCM_APPID
    });

    const messaging = (() => {
      try {
        return firebase.messaging();
      } catch (e) {
        console.warn("Failed to obtain messaging: " + e.message, e);
        alert("Messaging not supported: " + e.message);
      }
    })();

    messaging.usePublicVapidKey(process.env.FCM_VAPID_KEY);

    let tokenRetries = 5;
    const retrieveToken = () => {
      messaging
        .getToken()
        .then(currentToken => {
          if (currentToken) {
            console.info("Got token", currentToken);
            this.token = currentToken;
            this.register(currentToken);
          } else {
            console.info("No Instance ID token available.");
            if (tokenRetries) {
              tokenRetries--;
              window.setTimeout(retrieveToken, 100);
            }
          }
        })
        .catch(function(err) {
          console.warn("An error occurred while retrieving token. ", err);
          if (tokenRetries) {
            tokenRetries--;
            window.setTimeout(retrieveToken, 100);
          }
        });
    };

    messaging
      .requestPermission()
      .then(() => {
        console.info("Notification permission granted.");
        retrieveToken();
      })
      .catch(err => {
        console.warn("Unable to get permission to notify.", err);
        this.requestNotifications(() => {
          messaging.requestPermission().then(() => {
            console.info("Notification permission granted.");
            retrieveToken();
          });
        }, err);
      });

    messaging.onTokenRefresh(function() {
      messaging
        .getToken()
        .then(refreshedToken => {
          console.info("Token refreshed", refreshedToken);
          this.token = refreshedToken;
          this.register(token);
        })
        .catch(function(err) {
          console.warn("Unable to retrieve refreshed token ", err);
        });
    });

    // Handle Google FCM incoming messages. Called when:
    // - a message is received while the app has focus
    // - the user clicks on an app notification created by a service worker
    //   `messaging.setBackgroundMessageHandler` handler.
    messaging.onMessage(message => {
      console.info("Message received", message.data);
      this.onMessage(message.data);
    });

    if ("serviceWorker" in navigator) {
      // Handler for messages coming from the service worker
      navigator.serviceWorker.addEventListener("message", event => {
        if (event.data && event.data["firebase-messaging-msg-data"]) {
          // Handle new wrapped style firebase-js-sdk 7.x?
          console.info(
            "Client received message (new)",
            event.data["firebase-messaging-msg-data"].data
          );
          this.onMessage(event.data["firebase-messaging-msg-data"].data);
        } else {
          console.info("Client received message (old)", event.data);
          this.onMessage(event.data);
        }
      });
    }

    return this;
  }

  stop() {
    this.stopped = true;
    this.disableNotifications();
  }
}

class PollingMessaging extends Messaging {
  start(options) {
    Object.keys(options || {}).forEach(name => (this[name] = options[name]));

    this.token = window.localStorage.token;
    if (!this.token) {
      this.token = uuidV4();
      window.localStorage.token = this.token;
    }

    this.register(this.token).then(_ => {
      const pollMessagesLoop = _ => {
        if (!this.stopped) {
          this.poll().then(messages => {
            window.setTimeout(pollMessagesLoop, 2000);
          });
        }
      };

      pollMessagesLoop();
    });
  }

  stop() {
    this.stopped = true;
    this.disableNotifications();
  }
}

Messaging.create = () => {
  if (firebase.messaging.isSupported()) {
    return new FirebaseMessaging();
  } else {
    return new PollingMessaging();
  }
};

export { Messaging };
