// 一次性產生 PWA 圖示（需要 sharp：npm i --no-save sharp 後執行）。
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#d35432"/>
  <rect x="40" y="40" width="432" height="432" rx="72" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="8"/>
  <text x="256" y="256" text-anchor="middle" dominant-baseline="central"
    font-family="Noto Serif TC, PMingLiU, Microsoft JhengHei, serif" font-weight="900"
    font-size="288" fill="#ffffff">法</text>
</svg>`;

for (const size of [192, 512]) {
  const target = fileURLToPath(new URL(`../public/icon-${size}.png`, import.meta.url));
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(target);
  console.log(`generated icon-${size}.png`);
}
