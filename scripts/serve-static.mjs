// 簡易靜態伺服器：把 next build（output: export）產出的 out/ 提供給 Playwright 測試。
// 同時支援本機建置（無 basePath）與 CI 建置（basePath 為 /civil-law-quiz-tw）：
// 遇到 /civil-law-quiz-tw 前綴一律剝除後再對應到 out/ 檔案。
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out", import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const basePath = "/civil-law-quiz-tw";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === basePath || pathname.startsWith(`${basePath}/`)) {
      pathname = pathname.slice(basePath.length) || "/";
    }
    let filePath = normalize(join(root, pathname));
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    let stats = await stat(filePath).catch(() => null);
    if (stats?.isDirectory()) {
      filePath = join(filePath, "index.html");
      stats = await stat(filePath).catch(() => null);
    }
    if (!stats) {
      const body = await readFile(join(root, "404.html")).catch(() => Buffer.from("Not Found"));
      response.writeHead(404, { "content-type": "text/html; charset=utf-8" }).end(body);
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    }).end(body);
  } catch {
    response.writeHead(500).end();
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`static server ready at http://127.0.0.1:${port}`);
});
