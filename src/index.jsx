require("./app.scss");
import React from "react";
import ReactDOM from "react-dom";

const title = "My Minimal React Webpack Babel Setup";

// Preprocessed in webpack to real UI
const apiPath = process.env.API_UPLOAD_HANDLER_URL;
const imageBucket = process.env.IMAGE_BUCKET;

import { Card, Media, Image, Content, Heading } from "react-bulma-components";

const Profile = props => (
  <Card>
    <Card.Image
      size="4by3"
      src="http://bulma.io/images/placeholders/1280x960.png"
    />
    <Card.Content>
      <Media>
        <Media.Item>
          <Heading size={4}>John Smith</Heading>
          <Heading subtitle size={6}>
            @johnsmith
          </Heading>
        </Media.Item>
      </Media>
      <Content>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus nec
        iaculis mauris.
        <br />
        <a>@bulmaio</a> <a href="#1">#css</a> <a href="#2">#responsive</a>
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
        <Card.Footer.Item renderAs="a" href="#Maybe">
          Share
        </Card.Footer.Item>
      </Card.Footer>
    </Card.Content>
  </Card>
);

const UploadForm = props => (
  <form>
    <input type="file" id="uploadFile" onChange={props.onFileChange} />
  </form>
);

const App = props => (
  <section className="section">
    <div className="container">
      <h1 className="title">{title}</h1>
      <p className="subtitle">
        Demo profile <strong>Bulma</strong>!
      </p>
      <div>
        <Profile onUploadNewPicture={props.onUploadNewPicture} />
        <UploadForm onFileChange={props.onFileChange} />
      </div>
    </div>
  </section>
);

const onUploadNewPicture = () => {
  console.log("Button clicked");
};

const onFileChange = e => {
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
            : uploadResponse.text()
        )
        .then(upload => {
          console.info("Uploaded", upload);
        })
        .catch(uploadError => {
          console.warn("Failed to upload", uploadError);
        });
    })
    .catch(presignedError => {
      console.warn("Failed to generate upload link", presignedError);
    });
};

ReactDOM.render(
  <App onUploadNewPicture={onUploadNewPicture} onFileChange={onFileChange} />,
  document.getElementById("app")
);
