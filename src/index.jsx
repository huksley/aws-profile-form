import { h, render } from "preact";
require("./app.scss");

window.setTimeout(_ => {
  render(
    <div id="foo">
      <span>Hello, world!</span>
      <button onClick={e => alert("hi!")}>Click Me</button>
    </div>,
    document.body
  );
}, 50);
