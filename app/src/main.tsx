import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// BrowserRouter (saubere URLs wie /linie/4): läuft hinter eigenem nginx (siehe
// nginx.conf, SPA-Fallback auf index.html), daher kein HashRouter-Workaround nötig -
// AUSSER im Capacitor-Android-Build: dort gibt es keinen Server, der einen SPA-Fallback
// übernehmen könnte (die WebView lädt lokal gebündelte Dateien), tiefe Links wie
// /linie/4 würden ohne echten Server 404en. HashRouter (#/linie/4) braucht dafür keinen
// serverseitigen Rewrite und funktioniert rein clientseitig.
const isCapacitor = import.meta.env.VITE_CAPACITOR === "1";
const Router = isCapacitor ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isCapacitor ? (
      <Router>
        <App />
      </Router>
    ) : (
      <Router basename={import.meta.env.BASE_URL}>
        <App />
      </Router>
    )}
  </React.StrictMode>
);
