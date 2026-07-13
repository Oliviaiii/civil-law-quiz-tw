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
type Corpus = "司法特考四等" | "全部來源" | "示範題";
type FormatFilter = "選擇題" | "申論題" | "全部題型";
type SubjectFilter = "civil-law" | "criminal-law" | "constitution" | "all";

const subjectLabels: Record<Exclude<SubjectFilter, "all">, string> = {
  "civil-law": "民法",
  "criminal-law": "刑法",
  constitution: "憲法",
};

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

export default function Home() {
  const [view, setView] = useState<View>("practice");
  const [scope, setScope] = useState<Scope>("all");
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("civil-law");
  const [corpus, setCorpus] = useState<Corpus>("司法特考四等");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("選擇題");
  const [yearFilter, setYearFilter] = useState("全部年度");
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
        corpus === "全部來源" ||
        (corpus === "司法特考四等" && question.exam === "司法特考四等") ||
        (corpus === "示範題" && !question.exam);
      const subjectMatch = subjectFilter === "all" || question.subject === subjectFilter;
      const formatMatch =
        formatFilter === "全部題型" || question.format === formatFilter;
      const yearMatch =
        yearFilter === "全部年度" || question.rocYear === Number(yearFilter);
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
  }, [answeredIds, corpus, formatFilter, reviewingId, scope, subjectFilter, view, wrongIds, yearFilter]);

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
  const subjectName = subjectFilter === "all" ? "全科" : subjectLabels[subjectFilter];
  const selectedOfficialQuestions = questions.filter(
    (question) => question.exam && (subjectFilter === "all" || question.subject === subjectFilter),
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
                  <p>民國 105–114 年司法特考四等官方試題；民法、刑法與憲法分科保存進度，選擇題依考選部答案判定，申論題保留原題供閱讀與標記。</p>
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
                <label>
                  <span className="sr-only">依科目篩選</span>
                  <select value={subjectFilter} onChange={(event) => {
                    const nextSubject = event.target.value as SubjectFilter;
                    setReviewingId(null);
                    setSubjectFilter(nextSubject);
                    if (nextSubject === "constitution") {
                      setCorpus("司法特考四等");
                      setFormatFilter("選擇題");
                    }
                  }}>
                    <option value="civil-law">民法</option>
                    <option value="criminal-law">刑法</option>
                    <option value="constitution">憲法</option>
                    <option value="all">全部科目</option>
                  </select>
                </label>
                <label>
                  <span className="sr-only">依題庫來源篩選</span>
                  <select value={corpus} onChange={(event) => {
                    setReviewingId(null);
                    setCorpus(event.target.value as Corpus);
                  }}>
                    <option>司法特考四等</option>
                    <option>全部來源</option>
                    <option>示範題</option>
                  </select>
                </label>
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
                <label>
                  <span className="sr-only">依年度篩選</span>
                  <select value={yearFilter} onChange={(event) => {
                    setReviewingId(null);
                    setYearFilter(event.target.value);
                  }}>
                    <option>全部年度</option>
                    {years.map((year) => <option key={year} value={year}>{year} 年</option>)}
                  </select>
                </label>
                <span className="filter-count">符合 {visibleQuestions.length} 題</span>
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
                  <button onClick={() => { setScope("all"); setSubjectFilter("civil-law"); setCorpus("司法特考四等"); setFormatFilter("選擇題"); setYearFilter("全部年度"); startView("practice"); }}>
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

          {question.analysis ? (
            <>
              <div className="issue-box">
                <p className="eyebrow">題目在問什麼</p>
                <h3>{question.analysis.issue}</h3>
              </div>
              <div className="reasoning-grid">
                <div><span>01</span><h3>法律規則</h3><p>{question.analysis.rule}</p></div>
                <div><span>02</span><h3>套入本題</h3><p>{question.analysis.application}</p></div>
                <div><span>03</span><h3>結論</h3><p>{question.analysis.conclusion}</p></div>
              </div>
              <div className="trap-note">
                <strong>常見誤區</strong>
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
              <p className="verification-note">答案以考選部公告為準；解析由本站依命題時法、官方法條及實務資料自行整理，遇修法題已另行註明。</p>
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
        })),
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
