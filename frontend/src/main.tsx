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

  // Deep link: bet_XXXXXX → redirect to join page
  // Source 1: start_param from t.me/bot?startapp=bet_CODE direct links
  const startParam = (tg.initDataUnsafe as any)?.start_param as string | undefined;
  // Source 2: ?startapp= query param (fallback when opened via WebAppInfo URL)
  const urlStartapp = new URLSearchParams(window.location.search).get("startapp");
  const deepLink = startParam || urlStartapp || "";
  if (deepLink.startsWith("bet_")) {
    const betCode = deepLink.slice(4);
    if (betCode.length >= 4) {
      window.history.replaceState(null, "", `/bet/join/${betCode}`);
    }
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
