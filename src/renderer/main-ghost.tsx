import React from "react";
import ReactDOM from "react-dom/client";
import GhostApp from "./GhostApp";
import "./index.css"; // Reuse global styles

const fallback = document.getElementById("ghost-fallback");
if (fallback) fallback.style.display = "none";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GhostApp />
  </React.StrictMode>,
);
