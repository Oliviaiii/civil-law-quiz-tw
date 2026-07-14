import type { Question } from "../data/questions";

// 含「以上皆是」等指涉其他選項位置的題目，亂序會破壞題意，一律排除。
const orderSensitivePattern = /以上|上述|all of the above|none of the above/i;

export function hasOrderSensitiveOptions(question: Question): boolean {
  return question.options.some((option) => orderSensitivePattern.test(option));
}

/** 原始順序（不亂序時使用）。 */
export function identityOrder(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

/** 產生顯示用的選項順序；只影響顯示層，判題仍以原始 index 為準。 */
export function shuffledOptionOrder(question: Question): number[] {
  if (hasOrderSensitiveOptions(question)) return identityOrder(question.options.length);
  const order = identityOrder(question.options.length);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}
