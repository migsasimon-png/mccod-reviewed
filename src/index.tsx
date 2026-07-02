import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";
import * as serviceWorker from "./serviceWorker";
import { Provider } from "@dhis2/app-runtime";

// Local npm start: same-origin requests hit src/setupProxy.js (auth injected server-side).
const isLocalDev =
  process.env.NODE_ENV === "development" &&
  /localhost|127\.0\.0\.1/.test(window.location.hostname);

const dynamicBaseUrl = isLocalDev
  ? `${window.location.origin}/`
  : window.location.origin.includes("local")
  ? process.env.REACT_APP_DHIS2_BASE_URL
  : `${window.location.origin}/`;

let pathname;
if (window.location.pathname) {
  pathname = `${window.location.pathname.split("/")[1]}`;
  if (pathname === "api") pathname = false;
}

const actualBaseUrl = pathname
  ? `${dynamicBaseUrl}${pathname}/`
  : dynamicBaseUrl;

console.log("actualBaseUrl is ", actualBaseUrl);

const appConfig = {
  // baseUrl: process.env.REACT_APP_DHIS2_BASE_URL,
  // baseUrl: "https://qihmisug.org/dhis/",
  baseUrl: actualBaseUrl,
  apiVersion: 32,
};

ReactDOM.render(
  <Provider config={appConfig}>
    <App />
  </Provider>,
  document.getElementById("root")
);

// Register service worker for PWA functionality (offline support, caching, etc.)
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register({
  onSuccess: (registration) => {
    console.log('Service Worker registered successfully:', registration);
  },
  onUpdate: (registration) => {
    console.log('Service Worker updated:', registration);
    // Notify user that a new version is available
    if (window.confirm('A new version of the app is available. Reload to update?')) {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }
});
