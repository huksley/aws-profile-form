require("./app.scss");
import React from "react";
import ReactDOM from "react-dom";

// Preprocessed in webpack to real variables
const presignedFormEndpoint = process.env.API_UPLOAD_HANDLER_URL;
const imageBucket = process.env.IMAGE_BUCKET;

import { unsubscribeMessageHandler, subscribeMessageHandler } from "./message";
import { urlToBucketName, urlToKeyName, s3UrlToHttp } from "./util";
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
      waitProcessing: false,
      alertClearTimeout: null,
      fullName: getRandomName(true).join(" "),
      faceExpressions: undefined
    };
    this.onMessage = this.onMessage.bind(this);
    this.onUploadComplete = this.onUploadComplete.bind(this);
    this.onUserRegistration = this.onUserRegistration.bind(this);
    this.createUploadImageHandler = this.createUploadImageHandler.bind(this);
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

  onUserRegistration(userId, token, data) {
    this.setState({
      userId,
      token
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

  /**
   *
   */
  onMessage(msg) {
    console.log("New message", msg);

    if (msg && msg.message) {
      this.setState({
        alertMessage: msg.message,
        alertType: msg.type || "info",
        waitProcessing: true
      });

      if (msg.faces) {
        this.setState({ faceExpressions: JSON.parse(msg.faces) });
      }

      if (this.state.alertClearTimeout !== null) {
        clearTimeout(this.state.alertClearTimeout);
      }

      if (msg.code === "resize") {
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
