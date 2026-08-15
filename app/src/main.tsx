import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// BrowserRouter (saubere URLs wie /linie/4): läuft hinter eigenem nginx (siehe
// nginx.conf, SPA-Fallback auf index.html), daher kein HashRouter-Workaround nötig.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
