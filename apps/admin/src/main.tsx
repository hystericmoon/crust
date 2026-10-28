import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@puckeditor/core/puck.css";
import "@crust/blocks/styles.css";
import "./settings/settings.css";
import "./keyboard/keyboard.css";
import "./pages/pages.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
