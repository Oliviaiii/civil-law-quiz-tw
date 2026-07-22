// 此檔由 scripts/generate-question-data.mjs 自動產生，請勿手動修改。
// 提供首頁 shell 在題庫載入前就需要的統計與年度資訊（不含題目內容）。
export const questionYears = [114,113,112,111,110,109,108,107,106,105];
export const totalQuestionCount = 1090;
export const officialQuestionCount = 1090;
export const officialMultipleChoiceCount = 950;
export const officialEssayCount = 140;
export const officialCountsBySubject = {
  "civil-law": 201,
  "criminal-law": 201,
  "constitution": 150,
  "legal-introduction": 150,
  "english": 200,
  "chinese": 120,
  "administrative-law": 28,
  "civil-procedure": 20,
  "criminal-procedure": 20
} as const;
export const officialMcqCountsBySubject = {
  "civil-law": 175,
  "criminal-law": 175,
  "constitution": 150,
  "legal-introduction": 150,
  "english": 200,
  "chinese": 100,
  "administrative-law": 0,
  "civil-procedure": 0,
  "criminal-procedure": 0
} as const;
export const dataVersion = "d2e4f48d03da";
