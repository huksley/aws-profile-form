require("./app.scss");
import React from "react";
import ReactDOM from "react-dom";

import * as firebase from "firebase/app";
import "firebase/messaging";

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

messaging
  .requestPermission()
  .then(function() {
    console.info("Notification permission granted.");
  })
  .catch(function(err) {
    console.warn("Unable to get permission to notify.", err);
  });

messaging
  .getToken()
  .then(function(currentToken) {
    if (currentToken) {
      console.info("Got token", currentToken);
    } else {
      console.info("No Instance ID token available.");
    }
  })
  .catch(function(err) {
    console.warn("An error occurred while retrieving token. ", err);
  });

messaging.onTokenRefresh(function() {
  messaging
    .getToken()
    .then(function(refreshedToken) {
      console.info("Token refreshed", refreshedToken);
    })
    .catch(function(err) {
      console.warn("Unable to retrieve refreshed token ", err);
    });
});

// Handle incoming messages. Called when:
// - a message is received while the app has focus
// - the user clicks on an app notification created by a service worker
//   `messaging.setBackgroundMessageHandler` handler.
messaging.onMessage(function(payload) {
  console.info("Message received. ", payload);
});

const title = "My social app";

// Preprocessed in webpack to real UI
const apiPath = process.env.API_UPLOAD_HANDLER_URL;
const imageBucket = process.env.IMAGE_BUCKET;
const msgPath = process.env.API_MESSAGING_URL;

import { Card, Media, Content, Heading } from "react-bulma-components";

const Profile = props => (
  <Card>
    <Card.Image
      style={{ maxHeight: "450px", overflowY: "hidden" }}
      src={props.profileImageUrl}
    />
    <Card.Content>
      <Media>
        <Media.Item>
          <Heading size={4}>Mary Jane</Heading>
          <Heading subtitle size={6}>
            @maryjane
          </Heading>
        </Media.Item>
      </Media>
      <Content>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus nec
        iaculis mauris. <a>@goserverless</a> <a href="#1">#orchestration</a>{" "}
        <a href="#2">#rules</a>
        <br />
        <time dateTime="2016-1-1">11:09 PM, 1 Jan 2016</time>
      </Content>
      <Card.Footer>
        <Card.Footer.Item
          renderAs="a"
          href="#Yes"
          onClick={props.onUploadNewPicture}
        >
          <label htmlFor="uploadFile">New picture</label>
        </Card.Footer.Item>
        <Card.Footer.Item
          renderAs="a"
          href="https://twitter.com/intent/tweet?text=Take+a+look+at+my+profile+@maryjane"
        >
          Share
        </Card.Footer.Item>
      </Card.Footer>
    </Card.Content>
  </Card>
);

const UploadForm = props => (
  <form className="hidden">
    <input type="file" id="uploadFile" onChange={props.onFileChange} />
  </form>
);

const App = props => (
  <section className="section">
    <div className="container">
      <h1 className="title">{title}</h1>
      <p className="subtitle">My awesome profile</p>
      <div>
        <Profile
          profileImageUrl={props.profileImageUrl}
          onUploadNewPicture={props.onUploadNewPicture}
        />
        <UploadForm onFileChange={props.onFileChange} />
      </div>
    </div>
  </section>
);

const onUploadNewPicture = () => {
  console.log("Button clicked");
};

const onFileChange = uploadSuccessHandler => e => {
  console.log(e.target.files);
  const file = e.target.files[0];
  if (!file) {
    return;
  }
  console.log("Generating a upload form for " + file);
  fetch(apiPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      s3Url: "s3://" + imageBucket + "/" + file.name
    })
  })
    .then(presignedResponse => presignedResponse.json())
    .then(presigned => {
      console.info("Generated link", presigned);

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
          uploadSuccessHandler(imageBucket, file.name, upload.url + file.name);
        })
        .catch(uploadError => {
          console.warn("Failed to upload", uploadError);
        });
    })
    .catch(presignedError => {
      console.warn("Failed to generate upload link", presignedError);
    });
};

const onFileUploaded = (bucket, name, url) => {
  console.info("File uploaded " + bucket + ", " + name + ", " + url);
  const loc =
    window.location.protocol +
    "//" +
    window.location.host +
    window.location.pathname;
  window.location = loc + "?" + url;
};

const getProfileImageUrl = () => {
  const loc = String(window.location);
  if (loc.indexOf("?") === -1) {
    return "http://bulma.io/images/placeholders/1280x960.png";
  } else {
    return loc.substring(loc.indexOf("?") + 1);
  }
};

ReactDOM.render(
  <App
    profileImageUrl={getProfileImageUrl()}
    onUploadNewPicture={onUploadNewPicture}
    onFileChange={onFileChange(onFileUploaded)}
  />,
  document.getElementById("app")
);
