import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { PrivacyConsentGate } from "./modules/privacy";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PrivacyConsentGate>
      <App />
    </PrivacyConsentGate>
  </React.StrictMode>,
);
