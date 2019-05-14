import React from "react";
import ReactDOM from "react-dom";

export const PLACEHOLDER_URL =
  "http://bulma.io/images/placeholders/1280x960.png";

import {
  Card,
  Media,
  Content,
  Heading,
  Tag,
  Loader,
  Container,
  Section,
  Columns
} from "react-bulma-components";

const nop = () => {};

export const UploadForm = props => (
  <form className="hidden">
    <input type="file" id="uploadFile" onChange={props.onFileChange || nop} />
  </form>
);

export const Profile = props => (
  <Card>
    <div className="CardImageHolder">
      {props.waitProcessing ? (
        <div className="LoaderHolder">
          <Loader
            style={{
              width: "100%",
              height: "100%",
              border: "5px solid #b0b0b0",
              borderTopColor: "transparent",
              borderRightColor: "transparent"
            }}
          />
        </div>
      ) : (
        <Card.Image
          onClick={() => {
            document.getElementById("uploadFile").click();
          }}
          style={{ maxHeight: "450px", overflowY: "hidden" }}
          src={props.profileImageUrl || PLACEHOLDER_URL}
        />
      )}
    </div>
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
      </Content>
      <Content>
        <time dateTime="2016-1-1">11:09 PM, 1 Jan 2016</time>
      </Content>
    </Card.Content>
    <Card.Footer>
      <Card.Footer.Item
        renderAs="label"
        htmlFor="uploadFile"
        href="#uploadNewPicture"
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
  </Card>
);

export class Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  getUploadNewPictureHandler() {
    return undefined;
  }

  render() {
    return (
      <Section>
        <Container>
          <h1 className="title">My social app</h1>
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
              waitProcessing={this.state.waitProcessing}
            />
            <UploadForm
              onFileChange={this.getUploadNewPictureHandler() || nop}
            />
          </div>
        </Container>
      </Section>
    );
  }
}
