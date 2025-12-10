import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { AppRoot } from "./app-shell/AppRoot";
import { ThemeProvider } from "./app-shell/theme-context";
import { I18nProvider } from "./app-shell/i18n-context";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <AppRoot />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
