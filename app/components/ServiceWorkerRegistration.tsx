"use client";

import { useEffect } from "react";

/** 註冊離線用 Service Worker（開發模式不註冊）。 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => {
      // 離線功能屬漸進強化，註冊失敗不影響一般使用。
    });
  }, []);
  return null;
}
