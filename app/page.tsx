"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { questions, type Question } from "./data/questions";
import {
  createEmptyProgress,
  loadProgress,
  saveProgress,
  type ProgressData,
} from "./lib/progress-store";

type View = "practice" | "wrong" | "stats";
type Scope = "all" | "unanswered" | "wrong";

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
  const [category, setCategory] = useState("全部章節");
  const [currentId, setCurrentId] = useState(questions[0].id);
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
  const wrongIds = useMemo(
    () =>
      Object.entries(progress.answers)
        .filter(([, answer]) => !answer.lastCorrect)
        .map(([id]) => id),
    [progress],
  );
  const correctCount = Object.values(progress.answers).filter(
    (answer) => answer.lastCorrect,
  ).length;
  const accuracy = answeredIds.length
    ? Math.round((correctCount / answeredIds.length) * 100)
    : 0;

  const visibleQuestions = useMemo(() => {
    return questions.filter((question) => {
      const categoryMatch =
        category === "全部章節" || question.category === category;
      const scopeMatch =
        scope === "all" ||
        (scope === "unanswered" && !answeredIds.includes(question.id)) ||
        (scope === "wrong" && wrongIds.includes(question.id));
      const viewMatch = view !== "wrong" || wrongIds.includes(question.id);
      return categoryMatch && scopeMatch && viewMatch;
    });
  }, [answeredIds, category, scope, view, wrongIds]);

  const currentQuestion =
    visibleQuestions.find((question) => question.id === currentId) ??
    visibleQuestions[0];

  function chooseAnswer(index: number) {
    if (!currentQuestion) return;
    const isCorrect = index === currentQuestion.answer;
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

  function moveQuestion(direction: 1 | -1) {
    if (!currentQuestion || !visibleQuestions.length) return;
    const currentIndex = visibleQuestions.findIndex(
      (question) => question.id === currentQuestion.id,
    );
    const nextIndex =
      (currentIndex + direction + visibleQuestions.length) %
      visibleQuestions.length;
    setCurrentId(visibleQuestions[nextIndex].id);
  }

  function startView(nextView: View) {
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
    anchor.download = `民法練習紀錄-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("學習紀錄已匯出");
  }

  async function importProgress(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as ProgressData;
      if (data.version !== 1 || typeof data.answers !== "object") {
        throw new Error("invalid");
      }
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

  const categories = [
    "全部章節",
    ...Array.from(new Set(questions.map((question) => question.category))),
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => startView("practice")}>
          <span className="brand-mark">民</span>
          <span>
            <strong>民法研習室</strong>
            <small>台灣民法選擇題練習</small>
          </span>
        </button>
        <div className="top-progress" aria-label="整體進度">
          <span>{answeredIds.length} / {questions.length} 題已完成</span>
          <div className="progress-track">
            <i style={{ width: `${(answeredIds.length / questions.length) * 100}%` }} />
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
                  <h1>{view === "wrong" ? "把易錯觀念拆開重練" : "先判斷爭點，再選答案"}</h1>
                  <p>每題作答後立即顯示爭點、規則與涵攝，不只背選項。</p>
                </div>
                <div className="result-summary">
                  <span>本機題庫</span>
                  <strong>{questions.length}</strong>
                  <small>題示範題</small>
                </div>
              </div>

              <div className="filters" aria-label="題目篩選">
                <div className="segmented">
                  {(["all", "unanswered", "wrong"] as Scope[]).map((item) => (
                    <button
                      key={item}
                      className={scope === item ? "selected" : ""}
                      onClick={() => setScope(item)}
                    >
                      {item === "all" ? "全部" : item === "unanswered" ? "未作答" : "曾答錯"}
                    </button>
                  ))}
                </div>
                <label>
                  <span className="sr-only">依章節篩選</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {categories.map((item) => <option key={item}>{item}</option>)}
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
                  onMove={moveQuestion}
                />
              ) : (
                <div className="empty-state">
                  <span>✓</span>
                  <h2>{view === "wrong" ? "錯題已全部清空" : "這個篩選目前沒有題目"}</h2>
                  <p>{view === "wrong" ? "答對後會自動離開錯題本，繼續保持。" : "換一個章節或切回全部題目看看。"}</p>
                  <button onClick={() => { setScope("all"); setCategory("全部章節"); startView("practice"); }}>
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
  onMove,
}: {
  question: Question;
  position: number;
  total: number;
  previousAnswer?: ProgressData["answers"][string];
  onChoose: (index: number) => void;
  onMove: (direction: 1 | -1) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  function handleChoose(index: number) {
    if (revealed) return;
    setSelected(index);
    setRevealed(true);
    onChoose(index);
  }

  return (
    <article className="question-card">
      <div className="question-meta">
        <div>
          <span className="tag category">{question.category}</span>
          <span className={`tag type ${question.type === "個案型" ? "case" : ""}`}>{question.type}</span>
          <span className="tag difficulty">{question.difficulty}</span>
        </div>
        <span className="question-number">第 {position} / {total} 題</span>
      </div>

      <div className="source-line">
        <span>{question.source}</span>
        <span>題號 {question.id.toUpperCase()}</span>
        {previousAnswer && <span>上次作答 {formatDate(previousAnswer.lastAnsweredAt)}</span>}
      </div>

      <h2>{question.prompt}</h2>
      <p className="instruction">請選出最適當的答案。點選選項後即顯示解析。</p>

      <div className="options">
        {question.options.map((option, index) => {
          const isCorrect = revealed && index === question.answer;
          const isWrong = revealed && selected === index && index !== question.answer;
          return (
            <button
              key={option}
              className={`option ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
              onClick={() => handleChoose(index)}
              disabled={revealed}
            >
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span>{option}</span>
              {isCorrect && <b>正確</b>}
              {isWrong && <b>你的答案</b>}
            </button>
          );
        })}
      </div>

      {!revealed ? (
        <div className="answer-hint">
          <span>答題提醒</span>
          先圈出關鍵事實，確認題目真正問的法律效果，再逐一套用要件。
        </div>
      ) : (
        <section className={selected === question.answer ? "analysis correct-analysis" : "analysis wrong-analysis"} aria-live="polite">
          <div className="analysis-result">
            <span className="result-icon">{selected === question.answer ? "✓" : "!"}</span>
            <div>
              <p>{selected === question.answer ? "判斷正確" : "這題的陷阱在這裡"}</p>
              <strong>答案是 {String.fromCharCode(65 + question.answer)}</strong>
            </div>
            <span className={`confidence ${question.confidence === "高" ? "high" : "medium"}`}>
              解析信心 {question.confidence}
            </span>
          </div>

          <div className="issue-box">
            <p className="eyebrow">題目在問什麼</p>
            <h3>{question.analysis.issue}</h3>
          </div>

          <div className="reasoning-grid">
            <div>
              <span>01</span>
              <h3>法律規則</h3>
              <p>{question.analysis.rule}</p>
            </div>
            <div>
              <span>02</span>
              <h3>套入本題</h3>
              <p>{question.analysis.application}</p>
            </div>
            <div>
              <span>03</span>
              <h3>結論</h3>
              <p>{question.analysis.conclusion}</p>
            </div>
          </div>

          <div className="trap-note">
            <strong>常見誤區</strong>
            <p>{question.analysis.trap}</p>
          </div>

          <div className="statutes">
            <p className="eyebrow">相關法條</p>
            {question.statutes.map((statute) => (
              <a key={statute.article} href={statute.url} target="_blank" rel="noreferrer">
                <span>民法第 {statute.article} 條</span>
                <p>{statute.text}</p>
                <b>查看官方條文 ↗</b>
              </a>
            ))}
          </div>

          <p className="verification-note">本題為自行編寫之示範題，解析已依官方法條複核；個案仍可能因事實細節而有不同判斷。</p>
        </section>
      )}

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
  const categories = Array.from(new Set(questions.map((question) => question.category)));
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
          <div><p className="eyebrow">依章節</p><h2>學習分布</h2></div>
          <span>以每題最後一次作答為準</span>
        </div>
        {categories.map((item) => {
          const categoryQuestions = questions.filter((question) => question.category === item);
          const answered = categoryQuestions.filter((question) => progress.answers[question.id]).length;
          const correct = categoryQuestions.filter((question) => progress.answers[question.id]?.lastCorrect).length;
          return (
            <div className="chapter-row" key={item}>
              <strong>{item}</strong>
              <div className="chapter-track"><i style={{ width: `${(answered / categoryQuestions.length) * 100}%` }} /></div>
              <span>{answered}/{categoryQuestions.length} 完成</span>
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
