import "./digit-image-recognizer.mjs";

function setup() {
  // prevent submission of #url-form to server
  const form = document.querySelector("#url-form");
  form.addEventListener("submit", (ev) => ev.preventDefault());

  // copy any change in #ws-url from #url-form to @ws-url of #recognizer
  const recognizer = document.querySelector("#recognizer");
  const wsInput = document.querySelector("#ws-url");
  wsInput.addEventListener("change", (ev) => {
    ev.preventDefault();
    recognizer.setAttribute("ws-url", wsInput.value);
  });
}

window.addEventListener("DOMContentLoaded", () => setup());
