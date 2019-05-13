require("./app.scss");
import React from "react";
import ReactDOM from "react-dom";

const title = "My social app";

// Preprocessed in webpack to real variables
const apiPath = process.env.API_UPLOAD_HANDLER_URL;
const imageBucket = process.env.IMAGE_BUCKET;

import { Card, Media, Content, Heading, Tag } from "react-bulma-components";
import { unsubscribeMessageHandler, subscribeMessageHandler } from "./message";

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
          renderAs="label"
          htmlFor="uploadFile"
          href="#Yes"
          onClick={props.onUploadNewPicture}
        >
          New picture
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

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      profileImageUrl: "http://bulma.io/images/placeholders/1280x960.png",
      alertType: "info",
      alertMessage: "",
      userId: null,
      token: null
    };
    this.onMessage = this.onMessage.bind(this);
    this.onUploadComplete = this.onUploadComplete.bind(this);
    this.onUploadNewPicture = this.onUploadNewPicture.bind(this);
    this.onUserRegistration = this.onUserRegistration.bind(this);
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

  onMessage(msg) {
    console.log("New message", msg);
    if (msg && msg.message) {
      this.setState({
        alertMessage: msg.message,
        alertType: msg.type || "info"
      });
    }
  }

  onUploadNewPicture() {
    console.log("Button clicked");
  }

  onUploadComplete(bucket, key, url) {
    this.setState({
      profileImageUrl: url
    });
  }

  render() {
    return (
      <section className="section">
        <div className="container">
          <h1 className="title">{title}</h1>
          <p className="subtitle">My awesome profile</p>
          <div className="ProfileHolder">
            <div className="TagHolder">
              {this.state.alertMessage && (
                <Tag color={this.state.alertType}>
                  {this.state.alertMessage}
                </Tag>
              )}
            </div>
            <Profile
              profileImageUrl={this.state.profileImageUrl}
              onUploadNewPicture={this.onUploadNewPicture}
            />
            <UploadForm
              onFileChange={uploadFileHandlerGenerator(
                this.state.userId,
                this.onUploadComplete,
                this.onMessage
              )}
            />
          </div>
        </div>
      </section>
    );
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
    message: "Uploading " + file.name
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
