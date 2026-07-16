import type { Question } from "../data/questions";

/** mulberry32：以整數種子產生穩定的偽隨機序列，確保同一輪洗牌在重繪間不變。 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 依種子對題目清單做穩定的 Fisher–Yates 洗牌，只影響作答的前後順序；
 * 判題、題號與收藏等仍以題目本身為準。相同 (清單, 種子) 必得相同順序。
 */
export function shuffleQuestionOrder(questions: Question[], seed: number): Question[] {
  const random = mulberry32(seed);
  const order = [...questions];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}
