import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@puckeditor/core/puck.css";
import "@crust/blocks/styles.css";
import "./settings/settings.css";
import "./settings/chrome-groups.css";
import "./keyboard/keyboard.css";
import "./sections/sections.css";
import "./layouts/layouts.css";
import "./responsive/responsive.css";
import "./tabs/tabs.css";
import "./chrome-canvas.css";
import "./pages/pages.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
