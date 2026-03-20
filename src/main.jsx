import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const baseUrl = import.meta.env.BASE_URL;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${baseUrl}sw.js`).catch(() => {
      // Service worker is optional, so registration failures stay silent.
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);