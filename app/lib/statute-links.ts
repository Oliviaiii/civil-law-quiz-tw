import type { Question } from "../data/questions";

// 法條 key 正規化：「民法（命題時法）」視為民法；條號可能以「12、13」並列多條。
function normalizeLawName(lawName: string | undefined, subject: Question["subject"]): string {
  const base = lawName ?? (subject === "criminal-law" ? "刑法" : "民法");
  if (base.startsWith("民法")) return "民法";
  if (base.startsWith("刑法")) return "刑法";
  return base;
}

/** 一題引用的所有法條 key（law|article）。 */
export function statuteKeysOf(question: Question): Set<string> {
  const keys = new Set<string>();
  for (const statute of question.statutes) {
    const law = normalizeLawName(statute.lawName, question.subject);
    for (const token of statute.article.split(/[、，,]/)) {
      const article = token.trim();
      if (article) keys.add(`${law}|${article}`);
    }
  }
  return keys;
}

/** 關聯只由既有 statutes 欄位建立：找出引用相同法條的其他題目。 */
export function relatedQuestionsFor(
  allQuestions: Question[],
  current: Question,
  limit = 8,
): Question[] {
  const keys = statuteKeysOf(current);
  if (keys.size === 0) return [];
  const related: Question[] = [];
  for (const candidate of allQuestions) {
    if (candidate.id === current.id) continue;
    let matched = false;
    for (const key of statuteKeysOf(candidate)) {
      if (keys.has(key)) {
        matched = true;
        break;
      }
    }
    if (matched) related.push(candidate);
    if (related.length >= limit) break;
  }
  return related;
}

/** 法條頁用：引用指定法條的題目清單。 */
export function questionsCitingArticle(
  allQuestions: Question[],
  law: string,
  article: string,
): Question[] {
  const key = `${law}|${article}`;
  return allQuestions.filter((question) => statuteKeysOf(question).has(key));
}
