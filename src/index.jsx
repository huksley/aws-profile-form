require("./app.scss");
import React from "react";
import ReactDOM from "react-dom";

// Preprocessed in webpack to real variables
const presignedFormEndpoint = process.env.API_UPLOAD_HANDLER_URL;
const imageBucket = process.env.IMAGE_BUCKET;
const appVersion = process.env.CODE_VERSION;

import { Messaging } from "./message";
import { s3UrlToHttp } from "./util";
import { Page, PLACEHOLDER_URL } from "./layout";
import { getRandomName } from "./random-name";
import uploadFileHandlerGenerator from "./upload";

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
      latestMessages: [],
      requestNotifications: false,
      notificationHandler: () => { }
    };

    if (window.localStorage.latestMessages !== undefined) {
      try {
        this.state.latestMessages = JSON.parse(
          window.localStorage.latestMessages
        );
      } catch (e) {
        console.warn("Failed to parse old messages", e);
      }
    }
    this.onMessage = this.onMessage.bind(this);
    this.onUploadComplete = this.onUploadComplete.bind(this);
    this.onUserRegistration = this.onUserRegistration.bind(this);
    this.createUploadImageHandler = this.createUploadImageHandler.bind(this);
    this.requestNotifications = this.requestNotifications.bind(this);
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
    this.messaging.stop();
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
    this.messaging = Messaging.create();
    this.messaging.onMessage = this.onMessage;
    this.messaging.onRegistration = this.onUserRegistration;
    this.messaging.requestNotifications = this.requestNotifications;
    this.messaging.start();
  }

  componentWillUnmount() {
    this.messaging.stop();
  }

  requestNotifications(notificationHandler) {
    this.setState({
      waitProcessing: false,
      requestNotifications: true,
      notificationHandler: () => {
        notificationHandler();
        this.setState({ requestNotifications: false });
      }
    });
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
    const newMessages = this.state.latestMessages.concat([msg]);
    // Keep no more than 20 latest messages
    if (newMessages.length > 20) {
      newMessages.splice(0, newMessages.length - 20)
    }
    this.setState({
      latestMessages: newMessages
    });
    window.localStorage.latestMessages = JSON.stringify(newMessages);
  }

  /**
   * Receive new message
   */
  onMessage(msg) {
    if (msg && msg.message) {
      if (this.isDuplicate(msg)) {
        console.info("Duplicate message", msg);
        return;
      }

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
        this.setState({
          faceExpressions:
            typeof msg.faces === "string" ? JSON.parse(msg.faces) : msg.faces
        });
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
      } else if (msg.failed) {
        this.setState({
          waitProcessing: false
        })
      }
    }
  }

  onUploadComplete(bucket, key, url) {
    console.info("Upload complete", arguments);
    this.setState({ waitProcessing: true });
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
