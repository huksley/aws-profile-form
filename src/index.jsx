require("./app.scss");
import React from "react";
import ReactDOM from "react-dom";

// Preprocessed in webpack to real variables
const apiPath = process.env.API_UPLOAD_HANDLER_URL;
const imageBucket = process.env.IMAGE_BUCKET;

import { unsubscribeMessageHandler, subscribeMessageHandler } from "./message";
import { urlToBucketName, urlToKeyName } from "./util";
import { Page, PLACEHOLDER_URL } from "./layout";
import { getRandomName } from "./random-name";

// FIXME: never assume region
function s3UrlToHttp(s3Url) {
  return (
    "https://" +
    urlToBucketName(s3Url) +
    ".s3-eu-west-1.amazonaws.com/" +
    urlToKeyName(s3Url)
  );
}

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
      this.state.userId,
      this.onUploadComplete,
      this.onMessage
    );
  }

  onUserRegistration(userId, token) {
    this.setState({
      userId,
      token
    });
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

/**
 * Generates event listener which updates progress to specified function
 */
const uploadFileHandlerGenerator = (
  userId,
  uploadSuccessHandler,
  messageHandler
) => e => {
  console.log(e.target.files);
  const file = e.target.files[0];
  if (!file) {
    messageHandler({
      type: "danger",
      message: "No file selected"
    });
    return;
  }

  const ext =
    file.name.indexOf(".") > 0
      ? file.name.substring(file.name.indexOf(".") + 1)
      : "jpg";

  const targetFileName = userId + "-" + new Date().getTime() + "." + ext;
  const targetFolder = "profile/";

  messageHandler({
    message: "Uploading " + file.name,
    type: "info",
    start: true
  });
  console.info("Generating a upload form", file);
  fetch(apiPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      s3Url: "s3://" + imageBucket + "/" + targetFolder + targetFileName
    })
  })
    .then(presignedResponse => presignedResponse.json())
    .then(presigned => {
      console.info("Generated link", presigned);
      messageHandler({
        message: "Got presigned form"
      });
      const form = new FormData();
      for (const field in presigned.fields) {
        if (presigned.fields.hasOwnProperty(field)) {
          console.info("field " + field + " = " + presigned.fields[field]);
          form.append(field, presigned.fields[field]);
        }
      }
      form.append("file", file);

      fetch(presigned.url, {
        method: "POST",
        body: form
      })
        .then(uploadResponse =>
          uploadResponse.headers["Content-Type"] === "application/json"
            ? uploadResponse.json()
            : uploadResponse.status === 204
            ? uploadResponse
            : uploadResponse.text()
        )
        .then(upload => {
          console.info("Uploaded", upload);
          messageHandler({
            message: "Uploaded"
          });
          uploadSuccessHandler(
            imageBucket,
            file.name,
            upload.url + targetFolder + targetFileName
          );
        })
        .catch(uploadError => {
          console.warn("Failed to upload", uploadError);
          messageHandler({
            type: "warning",
            message: "Upload failed"
          });
        });
    })
    .catch(presignedError => {
      console.warn("Failed to generate upload link", presignedError);
      messageHandler({
        type: "warning",
        message: "Presigned form failed"
      });
    });
};

ReactDOM.render(<App />, document.getElementById("app"));
