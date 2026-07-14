export type EnglishQuestionRecord = {
  officialQuestionNumber: number;
  prompt: string;
  options: string[];
  answer: number;
  acceptedAnswers?: number[] | null;
  passage?: string;
};

export type EnglishAnalysis = {
  skill: "字彙與慣用語" | "文法與句型" | "克漏字" | "閱讀理解";
  answerReason: string;
  keyPoint: string;
  distractors: string;
  supportingSentence?: string;
};

const readingQuestion = /^(what|which|who|whom|whose|when|where|why|how|according|based|from|the passage|it can)/i;

function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function keywords(text: string) {
  return new Set(
    text
      .toLowerCase()
      .match(/[a-z][a-z'-]{2,}/g)
      ?.filter((word) => !["the", "and", "that", "this", "with", "from", "which", "what", "following"].includes(word)) ?? [],
  );
}

function findSupportingSentence(record: EnglishQuestionRecord, answerText: string) {
  if (!record.passage) return undefined;
  const target = keywords(`${record.prompt} ${answerText}`);
  return sentences(record.passage)
    .map((sentence) => ({
      sentence,
      score: [...keywords(sentence)].filter((word) => target.has(word)).length,
    }))
    .sort((left, right) => right.score - left.score)[0]?.sentence;
}

function completedContext(record: EnglishQuestionRecord, answerText: string) {
  if (record.prompt.includes("_____")) {
    return record.prompt.replace("_____", answerText);
  }
  if (record.passage) {
    const number = String(record.officialQuestionNumber);
    const numberedBlank = new RegExp(`(?:_____\\s*)?\\b${number}\\b(?:\\s*_____)?`);
    const matchingSentence = sentences(record.passage).find((sentence) => numberedBlank.test(sentence));
    if (matchingSentence) return matchingSentence.replace(numberedBlank, answerText);
  }
  return record.prompt;
}

export function buildEnglishAnalysis(record: EnglishQuestionRecord): EnglishAnalysis {
  const accepted = record.acceptedAnswers?.length ? record.acceptedAnswers : [record.answer];
  const answerText = accepted.map((index) => record.options[index]).join("／");
  const otherOptions = record.options
    .map((option, index) => ({ option, index }))
    .filter(({ index }) => !accepted.includes(index))
    .map(({ option, index }) => `${String.fromCharCode(65 + index)}「${option}」`)
    .join("、");
  const isPassageQuestion = Boolean(record.passage);
  const isReading = isPassageQuestion && readingQuestion.test(record.prompt.trim());
  const skill = isReading
    ? "閱讀理解"
    : isPassageQuestion
      ? "克漏字"
      : /\b(to|of|in|on|at|by|for|with)\s+_____|_____\s+(to|of|in|on|at|by|for|with)\b/i.test(record.prompt)
        ? "文法與句型"
        : "字彙與慣用語";
  const supportingSentence = findSupportingSentence(record, answerText);
  const context = completedContext(record, answerText);

  return {
    skill,
    answerReason: isReading
      ? `依考選部標準答案應選「${answerText}」。將題目關鍵詞與文章明示內容或主旨對照，可得到這個選項。`
      : `依考選部標準答案，空格應填「${answerText}」。填入後的語境為：${context}`,
    keyPoint: isReading
      ? `先判斷題目問的是主旨、細節或推論，再回到文章定位同義改寫；不要只因選項出現文章原字就作答。`
      : skill === "克漏字"
        ? `同時檢查空格前後的詞性、搭配與整段語意；本題答案必須讓句法及上下文都連貫。`
        : `先由空格位置判斷所需詞性或片語功能，再用全句語意排除不合的選項。`,
    distractors: `${otherOptions || "其餘選項"}未能同時符合本句或文章的語法、搭配與語意。選項字面看似相關時，仍須放回完整上下文核對。`,
    supportingSentence,
  };
}
