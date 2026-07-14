import type { Corpus, FilterState, SubjectFilter } from "./quiz-filters";

/** public/data/search-index.json 中的一筆輕量題目索引。 */
export type SearchEntry = {
  id: string;
  subject: SubjectFilter;
  subjectLabel: string;
  corpus: Corpus;
  rocYear?: number;
  format: "選擇題" | "申論題";
  number?: number;
  source: string;
  prompt: string;
  options: string[];
  laws: string[];
  keywords: string;
};

let indexCache: SearchEntry[] | null = null;

/** 載入搜尋索引（fetch 一次後全站共用；失敗時拋出讓呼叫端顯示錯誤）。 */
export async function loadSearchIndex(): Promise<SearchEntry[]> {
  if (indexCache) return indexCache;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const response = await fetch(`${basePath}/data/search-index.json`);
  if (!response.ok) throw new Error(`search index ${response.status}`);
  indexCache = (await response.json()) as SearchEntry[];
  return indexCache;
}

const subjectAliases: Record<string, SubjectFilter> = {
  民法: "civil-law",
  民: "civil-law",
  刑法: "criminal-law",
  刑: "criminal-law",
  憲法: "constitution",
  憲: "constitution",
  法緒: "legal-introduction",
  法學緒論: "legal-introduction",
  英文: "english",
  英: "english",
  國文: "chinese",
  國: "chinese",
  行政法: "administrative-law",
  行政: "administrative-law",
  民訴: "civil-procedure",
  民事訴訟法: "civil-procedure",
  刑訴: "criminal-procedure",
  刑事訴訟法: "criminal-procedure",
};

type StructuredQuery = { year?: number; subject?: SubjectFilter; number: number };

/** 解析「114 法緒 18」這類民國年度＋科目＋官方題號的快速查找。 */
export function parseStructuredQuery(query: string): StructuredQuery | null {
  const tokens = query.trim().split(/\s+/);
  if (tokens.length < 2 || tokens.length > 3) return null;
  let year: number | undefined;
  let subject: SubjectFilter | undefined;
  let number: number | undefined;
  for (const token of tokens) {
    if (year === undefined && /^1[0-2]\d$/.test(token)) year = Number(token);
    else if (subject === undefined && subjectAliases[token]) subject = subjectAliases[token];
    else if (number === undefined && /^\d{1,2}$/.test(token)) number = Number(token);
    else return null;
  }
  if (number === undefined) return null;
  return { year, subject, number };
}

/** 搜尋結果沿用目前的科目、來源、年度及題型篩選。 */
function matchesFilters(entry: SearchEntry, filters: FilterState): boolean {
  const subjectMatch = filters.subjects.length === 0 || filters.subjects.includes(entry.subject);
  const corpusMatch = filters.corpora.length === 0 || filters.corpora.includes(entry.corpus);
  const formatMatch = filters.format === "全部題型" || entry.format === filters.format;
  const yearMatch =
    filters.years.length === 0 ||
    (entry.rocYear !== undefined && filters.years.includes(entry.rocYear));
  return subjectMatch && corpusMatch && formatMatch && yearMatch;
}

function haystackOf(entry: SearchEntry): string {
  return [
    entry.prompt,
    entry.options.join(" "),
    entry.subjectLabel,
    entry.source,
    entry.laws.join(" "),
    entry.keywords,
  ]
    .join(" ")
    .toLowerCase();
}

/** 在目前篩選範圍內搜尋；支援全文關鍵字（可多詞）與「年度 科目 題號」快速跳轉。 */
export function searchEntries(
  entries: SearchEntry[],
  query: string,
  filters: FilterState,
): SearchEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const scoped = entries.filter((entry) => matchesFilters(entry, filters));

  const structured = parseStructuredQuery(trimmed);
  if (structured) {
    return scoped.filter(
      (entry) =>
        entry.number === structured.number &&
        (structured.year === undefined || entry.rocYear === structured.year) &&
        (structured.subject === undefined || entry.subject === structured.subject),
    );
  }

  const terms = trimmed.toLowerCase().split(/\s+/);
  return scoped.filter((entry) => {
    const haystack = haystackOf(entry);
    return terms.every((term) => haystack.includes(term));
  });
}
