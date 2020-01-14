require("./app.scss");
import React from "react";
import ReactDOM from "react-dom";

// Preprocessed in webpack to real variables
const presignedFormEndpoint = process.env.API_UPLOAD_HANDLER_URL;
const imageBucket = process.env.IMAGE_BUCKET;
const appVersion = process.env.CODE_VERSION;

import { unsubscribeMessageHandler, subscribeMessageHandler } from "./message";
import { s3UrlToHttp } from "./util";
import { Page, PLACEHOLDER_URL } from "./layout";
import { getRandomName } from "./random-name";
import { uploadFileHandlerGenerator } from "./upload";

class App extends Page {
  constructor(props) {
    super(props);
    this.state = {
      profileImageUrl: PLACEHOLDER_URL,
      alertType: "info",
      alertMessage: "",
      userId: null,
      token: null,
      waitProcessing: true,
      alertClearTimeout: null,
      fullName: getRandomName(true).join(" "),
      faceExpressions: undefined,
      otherProfiles: [],
      latestMessages: []
    };
    this.onMessage = this.onMessage.bind(this);
    this.onUploadComplete = this.onUploadComplete.bind(this);
    this.onUserRegistration = this.onUserRegistration.bind(this);
    this.createUploadImageHandler = this.createUploadImageHandler.bind(this);
    this.disableNotifications = this.disableNotifications.bind(this);
    console.info("Starting app " + appVersion);
  }

  createUploadImageHandler() {
    return uploadFileHandlerGenerator(
      presignedFormEndpoint,
      imageBucket,
      this.state.userId,
      this.onUploadComplete,
      this.onMessage
    );
  }

  disableNotifications(event) {
    event.stopPropagation();
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        console.info("Unregistering service worker", registration);
        registration.unregister();
        this.setState({ alertMessage: "Stopped. Reload or close tab." });
      }
    });
    return false;
  }

  onUserRegistration(userId, token, data) {
    this.setState({
      userId,
      token,
      waitProcessing: false
    });

    if (data && data.fields && data.fields.thumbnailUrl) {
      this.setState({
        profileImageUrl: s3UrlToHttp(data.fields.thumbnailUrl)
      });
    }
  }

  componentDidMount() {
    subscribeMessageHandler(this.onMessage, this.onUserRegistration);
  }

  componentWillUnmount() {
    unsubscribeMessageHandler(this.onMessage);
  }

  // Check message was already received
  isDuplicate(msg) {
    return (
      this.state.latestMessages
        .map(existing => JSON.stringify(existing) == JSON.stringify(msg))
        .filter(value => value).length > 0
    );
  }

  // Save message
  saveMessage(msg) {
    this.setState({
      latestMessages: this.state.latestMessages.concat([msg])
    });
  }

  /**
   * Receive new message
   */
  onMessage(msg) {
    if (msg && msg.message && !this.isDuplicate(msg)) {
      console.info("New message", msg);
      this.saveMessage(msg);

      if (
        msg.code === "new-user" ||
        msg.code === "user-online" ||
        (msg.code === "user-pic" && msg.userId === this.state.userId)
      ) {
        // Ignore these topic messages for now
        console.info("Ignoring message", msg);
        return;
      }

      if (msg.code !== "user-pic") {
        this.setState({
          alertMessage: msg.message,
          alertType: msg.type || "info",
          waitProcessing: true
        });
      }

      if (msg.faces) {
        this.setState({ faceExpressions: JSON.parse(msg.faces) });
      }

      if (this.state.alertClearTimeout !== null) {
        clearTimeout(this.state.alertClearTimeout);
      }

      if (msg.code === "user-pic" && msg.userId !== this.state.userId) {
        const url = s3UrlToHttp(msg.thumbnailUrl);
        this.setState({
          otherProfiles: this.state.otherProfiles.concat(url)
        });
      } else if (msg.code === "resize") {
        const url = s3UrlToHttp(msg.thumbnailUrl);
        this.setState({
          profileImageUrl: url,
          waitProcessing: false,
          // Dismissable
          alertClearTimeout: setTimeout(() => {
            this.setState({ alertMessage: "", alertClearTimeout: null });
          }, 5000)
        });
      } else if (msg.code === "rekognition-failed") {
        this.setState({
          alertType: "danger",
          profileImageUrl: PLACEHOLDER_URL,
          waitProcessing: false,
          // Dismissable
          alertClearTimeout: setTimeout(() => {
            this.setState({ alertMessage: "", alertClearTimeout: null });
          }, 5000)
        });
      } else if (msg.code === "resize-failed") {
        this.setState({
          alertType: "danger",
          profileImageUrl: PLACEHOLDER_URL,
          waitProcessing: false,
          // Dismissable
          alertClearTimeout: setTimeout(() => {
            this.setState({ alertMessage: "", alertClearTimeout: null });
          }, 5000)
        });
      }
    }
  }

  onUploadComplete(bucket, key, url) {
    console.info("Upload complete", arguments);
    this.setState({ waitProcessing: true });
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
