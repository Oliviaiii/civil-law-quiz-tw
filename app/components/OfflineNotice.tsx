"use client";

import { useEffect, useState } from "react";

/** 離線時顯示說明：已載入的題目仍可作答，外部連結（官方 PDF 等）暫時無法開啟。 */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="offline-notice" role="status">
      目前離線：已載入的題目與解析仍可作答並保存進度；官方試題 PDF 等外部連結需連線後才能開啟。
    </div>
  );
}
