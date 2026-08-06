import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// HashRouter (URLs wie /#/linie/4) statt BrowserRouter: GitHub Pages kann keine
// Server-Rewrites für clientseitiges Routing, ein Reload auf einer Unterseite würde
// mit BrowserRouter sonst 404 liefern. Kein SPA-Fallback-Trick nötig.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
