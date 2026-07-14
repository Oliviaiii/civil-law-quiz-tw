// 此檔由 scripts/generate-question-data.mjs 自動產生，請勿手動修改。
const CACHE_NAME = "clerk-law-room-3ec01ef0df00";
const BASE = self.registration.scope.replace(/\/$/, "");

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(BASE + "/");
    if (!response.ok) return;
    await cache.put(BASE + "/", response.clone());
    const html = await response.text();
    const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
    await Promise.all(
      urls.map(async (url) => {
        try {
          const asset = await fetch(url);
          if (asset.ok) await cache.put(url, asset.clone());
        } catch {}
      }),
    );
  } catch {}
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
      await precacheShell();
    })(),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) ?? (await cache.match(BASE + "/"));
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // 外部連結（官方 PDF、法規資料庫等）不攔截也不快取。
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.includes("/_next/static/") || url.pathname.includes("/data/") || /\.(?:png|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
