import type { Question } from "../data/questions";

/** 洗牌種子：128-bit 狀態（四個 32-bit 字），由加密級亂數產生。 */
export type ShuffleSeed = readonly [number, number, number, number];

function fallbackWord(): number {
  // 僅在無 Web Crypto 的環境（理論上不會發生於瀏覽器）作為後備熵來源。
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

/** 產生加密級隨機種子；優先使用 crypto.getRandomValues，取得真隨機而非可預測序列。 */
export function randomShuffleSeed(): ShuffleSeed {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const words = crypto.getRandomValues(new Uint32Array(4));
    return [words[0], words[1], words[2], words[3]];
  }
  return [fallbackWord(), fallbackWord(), fallbackWord(), fallbackWord()];
}

/**
 * sfc32（Small Fast Counter）：128-bit 狀態的高品質 PRNG，
 * 統計亂度優於 mulberry32，用來驅動洗牌以取得「超級亂序」。
 */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * 依種子對題目清單做穩定的 Fisher–Yates 洗牌（均勻分布，各排列等機率）。
 * 只影響作答的前後順序；判題、題號與收藏等仍以題目本身為準。
 * 相同 (清單, 種子) 必得相同順序，確保重繪與上一題／下一題導覽一致。
 */
export function shuffleQuestionOrder(questions: Question[], seed: ShuffleSeed): Question[] {
  const random = sfc32(seed[0], seed[1], seed[2], seed[3]);
  // sfc32 建議先空轉數輪，讓狀態充分混合再取值。
  for (let warmup = 0; warmup < 15; warmup += 1) random();
  const order = [...questions];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}
