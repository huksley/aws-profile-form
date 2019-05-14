import React from "react";
import ReactDOM from "react-dom";

export const PLACEHOLDER_URL =
  "https://imgplaceholder.com/800x600?text=Upload+new...";

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
          <Heading size={4}>{props.fullName}</Heading>
          <Heading subtitle size={6}>
            @{props.fullName.toLowerCase().replace(" ", "")}
          </Heading>
        </Media.Item>
      </Media>
      <Content>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus nec
        iaculis mauris.{" "}
        <a href="https://twitter.com/goserverless">@goserverless</a>{" "}
        <a href="https://twitter.com/search?q=%23microservice+%23orchestration">
          #microservice
        </a>{" "}
        <a href="https://twitter.com/search?q=%23microservice+%23orchestration">
          #orchestration
        </a>{" "}
        <a href="https://twitter.com/search?q=#amazing">#rules</a>
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
        <i className="fas fa-camera"> </i>&nbsp;New picture
      </Card.Footer.Item>
      <Card.Footer.Item
        renderAs="a"
        href={
          "https://twitter.com/intent/tweet?text=Take+a+look+at+my+amazing+new+profile+@" +
          props.fullName.toLowerCase().replace(" ", "")
        }
      >
        <i className="fab fa-twitter"> </i>&nbsp;Share
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
              fullName={this.state.fullName || "Mary Jane"}
            />
            <UploadForm
              onFileChange={this.getUploadNewPictureHandler() || nop}
            />
            <div className="footerLink">
              Serverless orchestration demo by{" "}
              <a href="https://twitter.com/huksley_">huksley</a>
            </div>
          </div>
        </Container>
      </Section>
    );
  }
}
