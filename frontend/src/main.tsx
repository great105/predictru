import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Telegram WebApp: configure BEFORE React renders
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  // Prevent swipe-to-close so scroll works properly
  (tg as any).disableVerticalSwipes?.();
  // Force dark theme — override Telegram's light background
  try {
    (tg as any).setBackgroundColor?.("#0a0e1a");
    (tg as any).setHeaderColor?.("#0a0e1a");
  } catch {
    /* older clients may not support these */
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
