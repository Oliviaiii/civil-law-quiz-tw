"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  questions,
  type Question,
} from "./data/questions";
import {
  createEmptyProgress,
  loadProgress,
  parseProgress,
  saveProgress,
  type ProgressData,
} from "./lib/progress-store";

type View = "practice" | "wrong" | "stats";
type Scope = "all" | "unanswered" | "wrong";
type Corpus = "司法特考四等" | "示範題";
type FormatFilter = "選擇題" | "申論題" | "全部題型";
type SubjectFilter =
  | "civil-law"
  | "criminal-law"
  | "constitution"
  | "legal-introduction"
  | "english"
  | "chinese"
  | "administrative-law"
  | "civil-procedure"
  | "criminal-procedure";

const subjectLabels: Record<SubjectFilter, string> = {
  "civil-law": "民法",
  "criminal-law": "刑法",
  constitution: "憲法",
  "legal-introduction": "法學緒論",
  english: "英文",
  chinese: "國文",
  "administrative-law": "行政法概要",
  "civil-procedure": "民事訴訟法概要",
  "criminal-procedure": "刑事訴訟法概要",
};

const subjectOptions: { value: SubjectFilter; label: string }[] = [
  { value: "chinese", label: "國文" },
  { value: "civil-law", label: "民法" },
  { value: "criminal-law", label: "刑法" },
  { value: "administrative-law", label: "行政法概要" },
  { value: "civil-procedure", label: "民事訴訟法概要" },
  { value: "criminal-procedure", label: "刑事訴訟法概要" },
  { value: "constitution", label: "憲法" },
  { value: "legal-introduction", label: "法學緒論" },
  { value: "english", label: "英文" },
];

const corpusOptions: { value: Corpus; label: string }[] = [
  { value: "司法特考四等", label: "司法特考四等" },
  { value: "示範題", label: "示範題" },
];

const viewLabels: Record<View, string> = {
  practice: "開始練習",
  wrong: "錯題本",
  stats: "學習紀錄",
};

function formatDate(value?: string) {
  if (!value) return "尚未作答";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MultiSelectFilter<T extends string | number>({
  ariaLabel,
  className = "",
  allLabel,
  options,
  selected,
  summary,
  onChange,
}: {
  ariaLabel: string;
  className?: string;
  allLabel: string;
  options: { value: T; label: string }[];
  selected: T[];
  summary: string;
  onChange: (values: T[]) => void;
}) {
  function toggle(value: T) {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(next.length === options.length ? [] : next);
  }

  return (
    <details className={`multi-select ${className}`}>
      <summary aria-label={ariaLabel}>{summary}</summary>
      <div className="multi-select-menu">
        <button
          type="button"
          className={selected.length === 0 ? "all-option selected" : "all-option"}
          onClick={() => onChange([])}
        >
          {allLabel}
          {selected.length === 0 && <span>✓</span>}
        </button>
        <div className="multi-select-options">
          {options.map((option) => (
            <label key={String(option.value)}>
              <input
                type="checkbox"
                value={option.value}
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          className="multi-select-done"
          onClick={(event) => {
            const details = event.currentTarget.closest("details");
            if (details) details.open = false;
          }}
        >
          完成
        </button>
      </div>
    </details>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("practice");
  const [scope, setScope] = useState<Scope>("all");
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectFilter[]>(["civil-law"]);
  const [selectedCorpora, setSelectedCorpora] = useState<Corpus[]>(["司法特考四等"]);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("選擇題");
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [currentId, setCurrentId] = useState(questions[0].id);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData>(createEmptyProgress());
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProgress(loadProgress());
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (ready) saveProgress(progress);
  }, [progress, ready]);

  const answeredIds = useMemo(() => Object.keys(progress.answers), [progress]);
  const multipleChoiceIds = useMemo(
    () => new Set(questions.filter((question) => question.format !== "申論題").map((question) => question.id)),
    [],
  );
  const answeredMultipleChoiceIds = answeredIds.filter((id) => multipleChoiceIds.has(id));
  const wrongIds = useMemo(
    () =>
      Object.entries(progress.answers)
        .filter(([, answer]) => !answer.lastCorrect)
        .map(([id]) => id),
    [progress],
  );
  const correctCount = answeredMultipleChoiceIds.filter(
    (id) => progress.answers[id]?.lastCorrect,
  ).length;
  const accuracy = answeredMultipleChoiceIds.length
    ? Math.round((correctCount / answeredMultipleChoiceIds.length) * 100)
    : 0;

  const visibleQuestions = useMemo(() => {
    return questions.filter((question) => {
      const corpusMatch =
        selectedCorpora.length === 0 ||
        (selectedCorpora.includes("司法特考四等") && question.exam === "司法特考四等") ||
        (selectedCorpora.includes("示範題") && !question.exam);
      const subjectMatch = selectedSubjects.length === 0 || selectedSubjects.includes(question.subject as SubjectFilter);
      const formatMatch =
        formatFilter === "全部題型" || question.format === formatFilter;
      const yearMatch = selectedYears.length === 0 || (question.rocYear !== undefined && selectedYears.includes(question.rocYear));
      const scopeMatch =
        scope === "all" ||
        (scope === "unanswered" &&
          (!answeredIds.includes(question.id) || question.id === reviewingId)) ||
        (scope === "wrong" &&
          (wrongIds.includes(question.id) || question.id === reviewingId));
      const viewMatch =
        view !== "wrong" ||
        wrongIds.includes(question.id) ||
        question.id === reviewingId;
      return subjectMatch && corpusMatch && formatMatch && yearMatch && scopeMatch && viewMatch;
    });
  }, [answeredIds, formatFilter, reviewingId, scope, selectedCorpora, selectedSubjects, selectedYears, view, wrongIds]);

  const currentQuestion =
    visibleQuestions.find((question) => question.id === currentId) ??
    visibleQuestions[0];
  const visibleAnsweredCount = visibleQuestions.filter(
    (question) => progress.answers[question.id],
  ).length;

  function chooseAnswer(index: number) {
    if (!currentQuestion || currentQuestion.format === "申論題") return;
    setReviewingId(currentQuestion.id);
    const isCorrect = Boolean(
      currentQuestion.allCredit ||
      (currentQuestion.acceptedAnswers?.length
        ? currentQuestion.acceptedAnswers.includes(index)
        : index === currentQuestion.answer),
    );
    setProgress((previous) => {
      const oldAnswer = previous.answers[currentQuestion.id];
      return {
        ...previous,
        answers: {
          ...previous.answers,
          [currentQuestion.id]: {
            attempts: (oldAnswer?.attempts ?? 0) + 1,
            lastSelected: index,
            lastCorrect: isCorrect,
            lastAnsweredAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  function markEssayRead() {
    if (!currentQuestion || currentQuestion.format !== "申論題") return;
    setReviewingId(currentQuestion.id);
    setProgress((previous) => {
      const oldAnswer = previous.answers[currentQuestion.id];
      return {
        ...previous,
        answers: {
          ...previous.answers,
          [currentQuestion.id]: {
            attempts: (oldAnswer?.attempts ?? 0) + 1,
            lastSelected: -1,
            lastCorrect: true,
            lastAnsweredAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  function moveQuestion(direction: 1 | -1) {
    if (!currentQuestion || !visibleQuestions.length) return;
    const currentIndex = visibleQuestions.findIndex(
      (question) => question.id === currentQuestion.id,
    );
    const nextIndex =
      (currentIndex + direction + visibleQuestions.length) %
      visibleQuestions.length;
    setReviewingId(null);
    setCurrentId(visibleQuestions[nextIndex].id);
    if (window.matchMedia("(max-width: 620px)").matches) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const card = document.querySelector<HTMLElement>(".question-card");
          if (!card) return;
          const stickyHeaderOffset = 122;
          window.scrollTo({
            top: card.getBoundingClientRect().top + window.scrollY - stickyHeaderOffset,
            behavior: "smooth",
          });
        });
      });
    }
  }

  function startView(nextView: View) {
    setReviewingId(null);
    setView(nextView);
    if (nextView === "wrong") setScope("wrong");
    if (nextView === "practice" && scope === "wrong") setScope("all");
  }

  function clearFilters() {
    setReviewingId(null);
    setScope("all");
    setSelectedSubjects([]);
    setSelectedCorpora([]);
    setFormatFilter("全部題型");
    setSelectedYears([]);
    setView("practice");
  }

  function exportProgress() {
    const blob = new Blob([JSON.stringify(progress, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `法院書記官題庫練習紀錄-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("學習紀錄已匯出");
  }

  async function importProgress(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = parseProgress(JSON.parse(await file.text()));
      setProgress(data);
      setNotice("學習紀錄已匯入");
    } catch {
      setNotice("檔案格式不正確，請選擇先前匯出的 JSON 檔");
    } finally {
      event.target.value = "";
    }
  }

  function resetProgress() {
    if (!window.confirm("確定要清除這個瀏覽器中的全部作答紀錄嗎？")) return;
    setProgress(createEmptyProgress());
    setNotice("作答紀錄已清除");
  }

  const years = Array.from(
    new Set(questions.flatMap((question) => question.rocYear ?? [])),
  ).sort((a, b) => b - a);
  const subjectName = selectedSubjects.length === 0
    ? "全科"
    : selectedSubjects.length <= 2
      ? selectedSubjects.map((subject) => subjectLabels[subject]).join("＋")
      : `${selectedSubjects.length}科`;
  const subjectSummary = selectedSubjects.length === 0
    ? "全部科目"
    : selectedSubjects.length <= 2
      ? selectedSubjects.map((subject) => subjectLabels[subject]).join("＋")
      : `已選 ${selectedSubjects.length} 科`;
  const yearSummary = selectedYears.length === 0
    ? "全部年度"
    : selectedYears.length === 1
      ? `${selectedYears[0]} 年`
      : `已選 ${selectedYears.length} 年`;
  const corpusSummary = selectedCorpora.length === 0
    ? "全部來源"
    : selectedCorpora.length === 1
      ? selectedCorpora[0]
      : `已選 ${selectedCorpora.length} 個來源`;
  const hasActiveFilters =
    scope !== "all" ||
    selectedSubjects.length > 0 ||
    selectedCorpora.length > 0 ||
    formatFilter !== "全部題型" ||
    selectedYears.length > 0;
  const selectedOfficialQuestions = questions.filter(
    (question) =>
      question.exam &&
      (selectedCorpora.length === 0 || selectedCorpora.includes("司法特考四等")) &&
      (selectedSubjects.length === 0 || selectedSubjects.includes(question.subject as SubjectFilter)) &&
      (selectedYears.length === 0 || (question.rocYear !== undefined && selectedYears.includes(question.rocYear))),
  );
  const selectedOfficialMultipleChoiceCount = selectedOfficialQuestions.filter(
    (question) => question.format === "選擇題",
  ).length;
  const selectedOfficialEssayCount = selectedOfficialQuestions.filter(
    (question) => question.format === "申論題",
  ).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => startView("practice")}>
          <span className="brand-mark">法</span>
          <span>
            <strong>書記官法科研習室</strong>
            <small>法院書記官法科考古題練習</small>
          </span>
        </button>
        <div className="top-progress" aria-label="整體進度">
          <span>{visibleAnsweredCount} / {visibleQuestions.length} 題已完成</span>
          <div className="progress-track">
            <i style={{ width: `${visibleQuestions.length ? (visibleAnsweredCount / visibleQuestions.length) * 100 : 0}%` }} />
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <nav aria-label="主要功能">
            {(Object.keys(viewLabels) as View[]).map((item) => (
              <button
                key={item}
                className={view === item ? "nav-item active" : "nav-item"}
                onClick={() => startView(item)}
              >
                <span>{item === "practice" ? "01" : item === "wrong" ? "02" : "03"}</span>
                {viewLabels[item]}
                {item === "wrong" && wrongIds.length > 0 && <b>{wrongIds.length}</b>}
              </button>
            ))}
          </nav>

          <section className="sidebar-card">
            <p className="eyebrow">今日狀態</p>
            <strong>{accuracy}%</strong>
            <span>目前答對率</span>
            <div className="mini-stats">
              <span><b>{correctCount}</b>答對</span>
              <span><b>{wrongIds.length}</b>待複習</span>
            </div>
          </section>

          <div className="storage-note">
            <span>LOCAL</span>
            紀錄只保存在這台裝置的瀏覽器
          </div>
        </aside>

        <section className="content">
          {view === "stats" ? (
            <StatsView
              progress={progress}
              accuracy={accuracy}
              correctCount={correctCount}
              wrongCount={wrongIds.length}
              answeredCount={answeredIds.length}
              onExport={exportProgress}
              onImport={() => importRef.current?.click()}
              onReset={resetProgress}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{view === "wrong" ? "REVIEW" : "PRACTICE"}</p>
                  <h1>{view === "wrong" ? `把${subjectName}易錯題目集中重練` : `近十年法院書記官${subjectName}考古題`}</h1>
                  <p>民國 105–114 年司法特考四等官方試題；九個科目分科保存進度，選擇題依考選部答案判定，作文、公文與法科申論題保留原題供閱讀與標記。</p>
                </div>
                <div className="result-summary">
                  <span>官方考古題</span>
                  <strong>{selectedOfficialQuestions.length}</strong>
                  <small>{selectedOfficialMultipleChoiceCount} 選擇＋{selectedOfficialEssayCount} 申論</small>
                </div>
              </div>

              <div className="filters" aria-label="題目篩選">
                <div className="segmented">
                  {(["all", "unanswered", "wrong"] as Scope[]).map((item) => (
                    <button
                      key={item}
                      className={scope === item ? "selected" : ""}
                      onClick={() => {
                        setReviewingId(null);
                        setScope(item);
                      }}
                    >
                      {item === "all" ? "全部" : item === "unanswered" ? "未作答" : "曾答錯"}
                    </button>
                  ))}
                </div>
                <MultiSelectFilter
                  ariaLabel="依科目複選篩選"
                  allLabel="全部科目"
                  options={subjectOptions}
                  selected={selectedSubjects}
                  summary={subjectSummary}
                  onChange={(values) => {
                    setReviewingId(null);
                    setSelectedSubjects(values);
                  }}
                />
                <MultiSelectFilter
                  ariaLabel="依題庫來源複選篩選"
                  className="corpus-filter"
                  allLabel="全部來源"
                  options={corpusOptions}
                  selected={selectedCorpora}
                  summary={corpusSummary}
                  onChange={(values) => {
                    setReviewingId(null);
                    setSelectedCorpora(values);
                  }}
                />
                <label>
                  <span className="sr-only">依題型篩選</span>
                  <select value={formatFilter} onChange={(event) => {
                    setReviewingId(null);
                    setFormatFilter(event.target.value as FormatFilter);
                  }}>
                    <option>選擇題</option>
                    <option>申論題</option>
                    <option>全部題型</option>
                  </select>
                </label>
                <MultiSelectFilter
                  ariaLabel="依年度複選篩選"
                  className="year-filter"
                  allLabel="全部年度"
                  options={years.map((year) => ({ value: year, label: `${year} 年` }))}
                  selected={selectedYears}
                  summary={yearSummary}
                  onChange={(values) => {
                    setReviewingId(null);
                    setSelectedYears(values);
                  }}
                />
                <span className="filter-count">符合 {visibleQuestions.length} 題</span>
                <button
                  type="button"
                  className="clear-filters"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  title="只清除篩選條件，不會刪除作答紀錄"
                >
                  清除所有篩選
                </button>
              </div>

              {currentQuestion ? (
                <QuestionCard
                  key={currentQuestion.id}
                  question={currentQuestion}
                  position={visibleQuestions.findIndex((item) => item.id === currentQuestion.id) + 1}
                  total={visibleQuestions.length}
                  previousAnswer={progress.answers[currentQuestion.id]}
                  onChoose={chooseAnswer}
                  onMarkRead={markEssayRead}
                  onMove={moveQuestion}
                />
              ) : (
                <div className="empty-state">
                  <span>✓</span>
                  <h2>{view === "wrong" ? "錯題已全部清空" : "這個篩選目前沒有題目"}</h2>
                  <p>{view === "wrong" ? "答對後會自動離開錯題本，繼續保持。" : "換一個年度、題型或切回全部題目看看。"}</p>
                  <button onClick={() => { setScope("all"); setSelectedSubjects(["civil-law"]); setSelectedCorpora(["司法特考四等"]); setFormatFilter("選擇題"); setSelectedYears([]); startView("practice"); }}>
                    回到全部題目
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={importProgress} />
      {notice && (
        <button className="toast" onClick={() => setNotice("")} aria-live="polite">
          {notice} <span>關閉</span>
        </button>
      )}
    </main>
  );
}

function QuestionCard({
  question,
  position,
  total,
  previousAnswer,
  onChoose,
  onMarkRead,
  onMove,
}: {
  question: Question;
  position: number;
  total: number;
  previousAnswer?: ProgressData["answers"][string];
  onChoose: (index: number) => void;
  onMarkRead: () => void;
  onMove: (direction: 1 | -1) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const isEssay = question.format === "申論題";
  const acceptedAnswers = question.acceptedAnswers?.length
    ? question.acceptedAnswers
    : question.answer === null ? [] : [question.answer];
  const answeredCorrect = Boolean(
    revealed && (question.allCredit || (selected !== null && acceptedAnswers.includes(selected))),
  );
  const answerLabel = question.allCredit
    ? "本題一律給分"
    : acceptedAnswers.length === 0
      ? "未公布"
      : acceptedAnswers.map((index) => String.fromCharCode(65 + index)).join(" 或 ");

  function handleChoose(index: number) {
    if (revealed || isEssay) return;
    setSelected(index);
    setRevealed(true);
    onChoose(index);
  }

  const navigation = (
    <div className="question-quick-nav" aria-label="題目切換">
      <button onClick={() => onMove(-1)}>← 上一題</button>
      <button className="next-button" onClick={() => onMove(1)}>下一題 →</button>
    </div>
  );

  return (
    <article className="question-card">
      <div className="question-meta">
        <div>
          <span className="tag category">{question.exam ?? question.category}</span>
          {question.exam && <span className="tag type">{question.subjectLabel}</span>}
          {question.rocYear && <span className="tag year">民國 {question.rocYear} 年</span>}
          <span className="tag difficulty">{question.format ?? "選擇題"}</span>
          {!question.exam && (
            <span className={`tag type ${question.type === "個案型" ? "case" : ""}`}>{question.type}</span>
          )}
        </div>
        <span className="question-number">第 {position} / {total} 題</span>
      </div>

      <div className="source-line">
        <span>{question.source}</span>
        {question.applicableCategories && <span>適用類科：{question.applicableCategories.join("、")}</span>}
        {question.sourceUrl && (
          <a href={question.sourceUrl} target="_blank" rel="noreferrer">官方試題 PDF ↗</a>
        )}
        {previousAnswer && <span>上次作答 {formatDate(previousAnswer.lastAnsweredAt)}</span>}
      </div>

      {question.passage && (
        <section className="passage-box" aria-label="共用文章">
          <p className="eyebrow">PASSAGE｜第 {question.officialQuestionNumber} 題所屬題組</p>
          <p>{question.passage}</p>
        </section>
      )}
      <h2>{question.prompt}</h2>
      {isEssay ? (
        <>
          <p className="instruction">申論題依原始試卷完整收錄；考選部未提供官方擬答。</p>
          <div className="essay-callout">
            <div>
              <strong>{previousAnswer ? "已標記閱讀" : "讀完後可標記進度"}</strong>
              <p>目前保留原題與官方試卷連結，不以 AI 擬答冒充官方答案。</p>
            </div>
            <button onClick={onMarkRead}>{previousAnswer ? "再次標記" : "標記已閱讀"}</button>
          </div>
          {navigation}
        </>
      ) : (
        <>
          <p className="instruction">請選出最適當的答案。點選選項後立即顯示官方答案。</p>
          <div className="options">
            {question.options.map((option, index) => {
              const isCorrect = revealed && (
                question.allCredit ? selected === index : acceptedAnswers.includes(index)
              );
              const isWrong = revealed && !question.allCredit && selected === index && !acceptedAnswers.includes(index);
              return (
                <button
                  key={`${index}-${option}`}
                  className={`option ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                  onClick={() => handleChoose(index)}
                  disabled={revealed}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span>{option}</span>
                  {isCorrect && <b>{question.allCredit ? "給分" : "正確"}</b>}
                  {isWrong && <b>你的答案</b>}
                </button>
              );
            })}
          </div>
          {navigation}
        </>
      )}

      {!isEssay && !revealed ? (
        <div className="answer-hint">
          <span>答題提醒</span>
          先圈出關鍵事實，確認題目真正問的法律效果，再逐一套用要件。
        </div>
      ) : !isEssay ? (
        <section className={answeredCorrect ? "analysis correct-analysis" : "analysis wrong-analysis"} aria-live="polite">
          <div className="analysis-result">
            <span className="result-icon">{answeredCorrect ? "✓" : "!"}</span>
            <div>
              <p>{question.allCredit ? "官方更正答案" : answeredCorrect ? "判斷正確" : "本題答錯"}</p>
              <strong>{question.allCredit ? answerLabel : `答案是 ${answerLabel}`}</strong>
            </div>
            {question.confidence && (
              <span className={`confidence ${question.confidence === "高" ? "high" : "medium"}`}>
                解析信心 {question.confidence}
              </span>
            )}
          </div>

          {question.englishAnalysis ? (
            <>
              <div className="issue-box">
                <p className="eyebrow">考點</p>
                <h3>{question.englishAnalysis.skill}</h3>
              </div>
              <section className="english-translation-card">
                <p className="eyebrow">題目繁中翻譯</p>
                <p>{question.englishAnalysis.promptTranslation}</p>
                {question.englishAnalysis.passageTranslation && (
                  <details>
                    <summary>查看共用文章繁中翻譯</summary>
                    <p>{question.englishAnalysis.passageTranslation}</p>
                  </details>
                )}
              </section>
              <section className="option-study-table" aria-label="選項翻譯與詞性">
                <div className="option-study-heading">
                  <p className="eyebrow">選項整理</p>
                  <span>英文｜詞性｜繁中意思</span>
                </div>
                {question.englishAnalysis.optionNotes.map((option) => (
                  <div className={option.correct ? "option-study-row correct" : "option-study-row"} key={option.label}>
                    <b>{option.label}</b>
                    <strong>{option.text}</strong>
                    <span className="part-of-speech">{option.partOfSpeech}</span>
                    <span>{option.translation}</span>
                    {option.correct && <em>正解</em>}
                  </div>
                ))}
              </section>
              <div className="english-analysis-grid">
                <div><span>01</span><h3>正確答案理由</h3><p>{question.englishAnalysis.answerReason}</p></div>
                <div><span>02</span><h3>關鍵句或文法結構</h3><p>{question.englishAnalysis.keyPoint}</p></div>
                {question.englishAnalysis.supportingSentence && (
                  <div><span>03</span><h3>文章定位</h3><p>{question.englishAnalysis.supportingSentence}</p></div>
                )}
              </div>
              <div className="trap-note">
                <strong>干擾選項</strong>
                <p>{question.englishAnalysis.distractors}</p>
              </div>
              <div className="statutes">
                <p className="eyebrow">官方來源</p>
                {question.references.map((reference) => (
                  <a key={`${reference.title}-${reference.locator ?? ""}`} href={reference.url} target="_blank" rel="noreferrer">
                    <span>{reference.title}{reference.locator ? `｜${reference.locator}` : ""}</span>
                    <b>查看官方資料 ↗</b>
                  </a>
                ))}
              </div>
              <p className="verification-note">答案以考選部公告為準；英文解析依官方文章、句法與語境自行整理，不轉載坊間題庫詳解。</p>
            </>
          ) : question.analysis ? (
            <>
              <div className="issue-box">
                <p className="eyebrow">題目在問什麼</p>
                <h3>{question.analysis.issue}</h3>
              </div>
              <div className="reasoning-grid">
                <div><span>01</span><h3>{question.subject === "chinese" ? "判讀原則" : "法律規則"}</h3><p>{question.analysis.rule}</p></div>
                <div><span>02</span><h3>{question.subject === "chinese" ? "解析" : "套入本題"}</h3><p>{question.analysis.application}</p></div>
                <div><span>03</span><h3>結論</h3><p>{question.analysis.conclusion}</p></div>
              </div>
              <div className="trap-note">
                <strong>{question.subject === "chinese" ? "選項辨析與常見誤區" : "常見誤區"}</strong>
                <p>{question.analysis.trap}</p>
              </div>
              {question.references.length > 0 && (
                <div className="statutes">
                  <p className="eyebrow">官方依據</p>
                  {question.references.map((reference) => (
                    <a key={`${reference.title}-${reference.locator ?? ""}`} href={reference.url} target="_blank" rel="noreferrer">
                      <span>{reference.title}{reference.locator ? `｜${reference.locator}` : ""}</span>
                      {reference.text && <p>{reference.text}</p>}
                      <b>查看官方資料 ↗</b>
                    </a>
                  ))}
                </div>
              )}
              <p className="verification-note">
                {question.subject === "chinese"
                  ? "答案以考選部公告為準；解析依題文語境、典故與常用語義自行整理，不轉載坊間題庫詳解。"
                  : "答案以考選部公告為準；解析由本站依命題時法、官方法條及實務資料自行整理，遇修法題已另行註明。"}
              </p>
            </>
          ) : (
            <div className="official-answer-note">
              <p className="eyebrow">OFFICIAL ANSWER</p>
              <h3>{question.answerSource ?? "考選部官方資料"}</h3>
              <p>
                考選部只公布標準答案、不提供解析。為避免 AI 誤判個案或引用錯誤法條，本批先忠實匯入題目與官方答案，解析將待逐題人工複核後再補上。
              </p>
              <div>
                {question.answerUrl && <a href={question.answerUrl} target="_blank" rel="noreferrer">查看官方答案 PDF ↗</a>}
                {question.sourceUrl && <a href={question.sourceUrl} target="_blank" rel="noreferrer">查看原始試題 PDF ↗</a>}
              </div>
            </div>
          )}
        </section>
      ) : null}

      <footer className="question-footer">
        <button onClick={() => onMove(-1)}>← 上一題</button>
        <button className="next-button" onClick={() => onMove(1)}>下一題 →</button>
      </footer>
    </article>
  );
}

function StatsView({
  progress,
  accuracy,
  correctCount,
  wrongCount,
  answeredCount,
  onExport,
  onImport,
  onReset,
}: {
  progress: ProgressData;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}) {
  const groups = [
    ...Object.entries(subjectLabels).flatMap(([subject, label]) =>
      Array.from(new Set(questions.flatMap((question) => question.rocYear ?? [])))
        .sort((a, b) => b - a)
        .map((year) => ({
          label: `${label}｜民國 ${year} 年`,
          questions: questions.filter(
            (question) => question.subject === subject && question.rocYear === year,
          ),
        }))
        .filter((group) => group.questions.length > 0),
    ),
    {
      label: "自行編寫示範題",
      questions: questions.filter((question) => !question.rocYear),
    },
  ];
  return (
    <div className="stats-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROGRESS</p>
          <h1>看見進度，也保留帶得走的紀錄</h1>
          <p>第一版資料存在瀏覽器，可隨時匯出備份。</p>
        </div>
      </div>

      <div className="stat-grid">
        <div><span>完成題數</span><strong>{answeredCount}<small> / {questions.length}</small></strong></div>
        <div><span>目前答對率</span><strong>{accuracy}<small>%</small></strong></div>
        <div><span>答對題數</span><strong>{correctCount}<small> 題</small></strong></div>
        <div><span>錯題待複習</span><strong>{wrongCount}<small> 題</small></strong></div>
      </div>

      <section className="chapter-progress">
        <div className="section-title">
          <div><p className="eyebrow">依科目</p><h2>獨立學習進度</h2></div>
          <span>以每題最後一次作答為準</span>
        </div>
        {groups.map((group) => {
          const answered = group.questions.filter((question) => progress.answers[question.id]).length;
          const correct = group.questions.filter((question) => progress.answers[question.id]?.lastCorrect).length;
          return (
            <div className="chapter-row" key={group.label}>
              <strong>{group.label}</strong>
              <div className="chapter-track"><i style={{ width: `${(answered / group.questions.length) * 100}%` }} /></div>
              <span>{answered}/{group.questions.length} 完成</span>
              <b>{answered ? Math.round((correct / answered) * 100) : 0}%</b>
            </div>
          );
        })}
      </section>

      <section className="data-card">
        <div>
          <p className="eyebrow">本機資料</p>
          <h2>備份與搬移學習紀錄</h2>
          <p>換電腦、換瀏覽器或清除網站資料前，先匯出 JSON。未來接上帳號同步時，這裡可換成雲端資料服務。</p>
        </div>
        <div className="data-actions">
          <button className="primary-action" onClick={onExport}>匯出紀錄</button>
          <button onClick={onImport}>匯入紀錄</button>
          <button className="danger-action" onClick={onReset}>清除全部</button>
        </div>
      </section>
    </div>
  );
}
