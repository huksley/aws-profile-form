require("./app.scss");
import React from "react";
import ReactDOM from "react-dom";

const title = "My Minimal React Webpack Babel Setup";

ReactDOM.render(
  <section class="section">
    <div class="container">
      <h1 class="title">{title}</h1>
      <p class="subtitle">
        My first website with <strong>Bulma</strong>!
      </p>
    </div>
  </section>,
  document.getElementById("app")
);
