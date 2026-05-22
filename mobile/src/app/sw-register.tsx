"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[Nexera SW] Registered, scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[Nexera SW] Registration failed:", err);
        });
    }
  }, []);

  return null;
}
