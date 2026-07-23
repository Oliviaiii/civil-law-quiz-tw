"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "./data/questions";
import { ExamCountdownCard } from "./components/ExamCountdownCard";
import { FiltersBar } from "./components/FiltersBar";
import { IntroductionView } from "./components/IntroductionView";
import { LawBrowserView } from "./components/LawBrowserView";
import { MockExamView } from "./components/MockExamView";
import { OfflineNotice } from "./components/OfflineNotice";
import { PracticeSetCreator, type PracticeSetRange } from "./components/PracticeSetCreator";
import { PracticeSetSession } from "./components/PracticeSetSession";
import { QuestionCard } from "./components/QuestionCard";
import { SearchPanel } from "./components/SearchPanel";
import { StatsView } from "./components/StatsView";
import { useMockExam } from "./hooks/use-mock-exam";
import { usePracticeSet } from "./hooks/use-practice-set";
import { usePreferences } from "./hooks/use-preferences";
import { useProgress } from "./hooks/use-progress";
import { useQuestionBank } from "./hooks/use-question-bank";
import { officialQuestionCount } from "./data/bank-manifest";
import { dailyPointer, dailyQuestionFrom } from "./lib/daily-question";
import { loadPreferences, type SessionSnapshot } from "./lib/preferences";
import { randomShuffleSeed, shuffleQuestionOrder, type ShuffleSeed } from "./lib/question-shuffle";
import {
  createEmptyProgress,
  loadProgress,
  localDateKey,
  parseProgress,
} from "./lib/progress-store";
import {
  filterQuestions,
  subjectLabels,
  viewLabels,
  type Corpus,
  type FormatFilter,
  type Scope,
  type SubjectFilter,
  type View,
} from "./lib/quiz-filters";
import type { SearchEntry } from "./lib/search";
import { reviewQueueOf } from "./lib/spaced-repetition";
import { relatedQuestionsFor } from "./lib/statute-links";

export default function Home() {
  const [view, setView] = useState<View>("practice");
  const [scope, setScope] = useState<Scope>("all");
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectFilter[]>(["civil-law"]);
  const [selectedCorpora, setSelectedCorpora] = useState<Corpus[]>(["司法特考四等"]);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("選擇題");
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [questionShuffleSeed, setQuestionShuffleSeed] = useState<ShuffleSeed | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [resumeOffer, setResumeOffer] = useState<
    { session: SessionSnapshot; questionId?: string } | null
  >(null);
  const [pendingDailyJump, setPendingDailyJump] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const pendingQuestionScrollRef = useRef(false);

  const {
    progress,
    setProgress,
    answeredIds,
    wrongIds,
    correctCount,
    accuracy,
    attemptAccuracy,
    recordAnswer,
    recordEssayRead,
    toggleStarred,
    toggleUncertain,
    saveEssayDraft,
    completeDailyQuestion,
    setExamDate,
    gradeStatuteCard,
    ready: progressReady,
  } = useProgress();

  const { practiceSet, createSet, leaveSet, moveCursor, markCompleted } = usePracticeSet();
  const { preferences, ready: preferencesReady, updatePreferences } = usePreferences();

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  // 深連結（#q=題目ID）優先；否則若有上次練習快照則顯示「繼續上次練習」。
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const match = window.location.hash.match(/^#q=([A-Za-z0-9-]+)$/);
      if (match) {
        // 放寬全部篩選，確保任何科目的目標題都會出現；無效 ID 會自然回到第一題。
        setSelectedSubjects([]);
        setSelectedCorpora([]);
        setFormatFilter("全部題型");
        setSelectedYears([]);
        setSelectedCategories([]);
        setScope("all");
        setCurrentId(match[1]);
        return;
      }
      const savedPreferences = loadPreferences();
      if (savedPreferences.lastSession) {
        setResumeOffer({
          session: savedPreferences.lastSession,
          questionId: loadProgress().lastVisited?.questionId,
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const mock = useMockExam({
    // 進行中的模擬考在重新整理後直接回到模擬考畫面。
    onRestoreRunning: () => setView("mock"),
  });

  // 學習紀錄與模擬考需要全科題庫；法條速查需要民法＋刑法；
  // 練習集進行中依集合內科目載入；其餘依選取科目。
  const {
    questions,
    loading: bankLoading,
    error: bankError,
  } = useQuestionBank(
    view === "stats" || view === "mock"
      ? []
      : view === "law"
        ? ["civil-law", "criminal-law"]
        : view === "practice" && practiceSet ? practiceSet.subjects : selectedSubjects,
  );

  // 間隔複習佇列：今日到期與逾期的題目。
  const reviewQueue = useMemo(() => reviewQueueOf(progress, new Date()), [progress]);
  const dueIds = useMemo(
    () => [...reviewQueue.overdue, ...reviewQueue.dueToday],
    [reviewQueue],
  );
  // 收藏與不確定標記（獨立於答對／答錯）。
  const starredIds = useMemo(
    () => Object.keys(progress.flags).filter((id) => progress.flags[id].starred),
    [progress],
  );
  const uncertainIds = useMemo(
    () => Object.keys(progress.flags).filter((id) => progress.flags[id].uncertain),
    [progress],
  );

  const visibleQuestions = useMemo(
    () =>
      filterQuestions(
        questions,
        {
          view,
          scope,
          subjects: selectedSubjects,
          corpora: selectedCorpora,
          format: formatFilter,
          years: selectedYears,
          categories: selectedCategories,
        },
        { answeredIds, wrongIds, dueIds, starredIds, uncertainIds, reviewingId },
      ),
    [answeredIds, dueIds, formatFilter, questions, reviewingId, scope, selectedCategories, selectedCorpora, selectedSubjects, selectedYears, starredIds, uncertainIds, view, wrongIds],
  );

  // 題目亂序：以加密級隨機種子穩定洗牌，導覽與定位一律以此清單為準；關閉或種子未就緒時維持預設排序。
  // 種子只在瀏覽器端產生（避免靜態網站 hydration 不一致），因此每次載入都是全新順序。
  const orderedVisibleQuestions = useMemo(
    () =>
      preferences.shuffleQuestions && questionShuffleSeed
        ? shuffleQuestionOrder(visibleQuestions, questionShuffleSeed)
        : visibleQuestions,
    [visibleQuestions, preferences.shuffleQuestions, questionShuffleSeed],
  );

  const currentQuestion =
    orderedVisibleQuestions.find((question) => question.id === currentId) ??
    orderedVisibleQuestions[0];
  const visibleAnsweredCount = visibleQuestions.filter(
    (question) => progress.answers[question.id],
  ).length;

  // 練習集題目依建立時抽定的順序排列，不因重新 render 改變。
  const practiceSetQuestions = useMemo(() => {
    if (!practiceSet) return [];
    const byId = new Map(questions.map((question) => [question.id, question]));
    return practiceSet.ids
      .map((id) => byId.get(id))
      .filter((question): question is Question => Boolean(question));
  }, [practiceSet, questions]);
  const currentSetQuestion = practiceSet
    ? practiceSetQuestions[Math.min(practiceSet.cursor, practiceSetQuestions.length - 1)]
    : undefined;

  // 只有在使用者切題時定位；等新題目完成 render 後，精準對齊題幹標題而非題卡頂端。
  useEffect(() => {
    if (!pendingQuestionScrollRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      pendingQuestionScrollRef.current = false;
      if (!window.matchMedia("(max-width: 620px)").matches) return;
      const heading = document.querySelector<HTMLElement>(".question-card > h2");
      if (!heading) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      heading.scrollIntoView({
        block: "start",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentQuestion?.id, currentSetQuestion?.id, practiceSet?.cursor]);

  // 考同一法條的其他題目（只由 statutes 欄位建立關聯）。
  const currentRelatedQuestions = useMemo(
    () => (currentQuestion ? relatedQuestionsFor(questions, currentQuestion) : []),
    [currentQuestion, questions],
  );

  // 每日一題：以日期種子決定，同日全站相同；題庫載入後解析出實際題目。
  const todayKey = localDateKey(new Date());
  const todayPointer = useMemo(() => dailyPointer(todayKey), [todayKey]);
  const dailyQuestion = useMemo(
    () => dailyQuestionFrom(questions, todayPointer),
    [questions, todayPointer],
  );
  const dailyCompletedToday = progress.dailyQuestion?.lastCompletedDate === todayKey;

  // 題目亂序偏好可能自 localStorage 記憶為開啟；種子只能在瀏覽器端產生，
  // 掛載後若缺種子就補一組加密級隨機值，確保每次載入都是全新順序（而非固定序）。
  // 這是「客戶端才產生隨機值以避免 SSR hydration 不一致」的標準模式，setState 僅於掛載後執行一次。
  useEffect(() => {
    if (preferences.shuffleQuestions && !questionShuffleSeed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestionShuffleSeed(randomShuffleSeed());
    }
  }, [preferences.shuffleQuestions, questionShuffleSeed]);

  useEffect(() => {
    if (!pendingDailyJump || !dailyQuestion) return;
    const timer = window.setTimeout(() => {
      setCurrentId(dailyQuestion.id);
      setPendingDailyJump(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pendingDailyJump, dailyQuestion]);

  // 保存最後檢視位置與篩選條件（debounce 後寫入，供「繼續上次練習」使用）。
  const currentQuestionId = currentQuestion?.id;
  useEffect(() => {
    if (view !== "practice" && view !== "wrong") return;
    if (practiceSet || !preferencesReady || !progressReady) return;
    // 「繼續上次練習」尚未回應前不覆寫快照，避免重新整理兩次後遺失原位置。
    if (resumeOffer) return;
    const timer = window.setTimeout(() => {
      updatePreferences({
        lastSession: {
          view,
          scope,
          subjects: selectedSubjects,
          corpora: selectedCorpora,
          format: formatFilter,
          years: selectedYears,
          categories: selectedCategories,
        },
      });
      if (currentQuestionId) {
        setProgress((previous) =>
          previous.lastVisited?.questionId === currentQuestionId
            ? previous
            : { ...previous, lastVisited: { questionId: currentQuestionId } },
        );
      }
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在畫面狀態變動時重寫快照
  }, [view, scope, selectedSubjects, selectedCorpora, formatFilter, selectedYears, selectedCategories, currentQuestionId, practiceSet, preferencesReady, progressReady, resumeOffer]);

  // currentId 代表使用者明確導航到的題目；為 null 時以篩選結果第一題為準。
  // 篩選或畫面切換時一律歸零，避免舊題目重新符合條件時畫面跳回舊位置，
  // 也避免空結果時殘留幽靈題目狀態。
  function resetQuestionCursor() {
    setReviewingId(null);
    setCurrentId(null);
    // 使用者已開始操作，收起「繼續上次練習」提示。
    setResumeOffer(null);
  }

  function chooseAnswer(index: number) {
    if (!currentQuestion || currentQuestion.format === "申論題") return;
    setReviewingId(currentQuestion.id);
    setCurrentId(currentQuestion.id);
    recordAnswer(currentQuestion, index);
    // 作答的正好是今日題目時累計連續天數。
    if (dailyQuestion && currentQuestion.id === dailyQuestion.id) completeDailyQuestion();
  }

  function markEssayRead() {
    if (!currentQuestion || currentQuestion.format !== "申論題") return;
    setReviewingId(currentQuestion.id);
    setCurrentId(currentQuestion.id);
    recordEssayRead(currentQuestion);
  }

  function moveQuestion(direction: 1 | -1) {
    if (!currentQuestion || !orderedVisibleQuestions.length) return;
    const currentIndex = orderedVisibleQuestions.findIndex(
      (question) => question.id === currentQuestion.id,
    );
    const nextIndex =
      (currentIndex + direction + orderedVisibleQuestions.length) %
      orderedVisibleQuestions.length;
    pendingQuestionScrollRef.current = true;
    setReviewingId(null);
    setCurrentId(orderedVisibleQuestions[nextIndex].id);
    setResumeOffer(null);
  }

  // ---- 練習集 ----

  function practicePoolFor(range: PracticeSetRange): Question[] {
    return filterQuestions(
      questions,
      {
        view: "practice",
        scope: range,
        subjects: selectedSubjects,
        corpora: selectedCorpora,
        format: formatFilter,
        years: selectedYears,
        categories: selectedCategories,
      },
      { answeredIds, wrongIds, dueIds, starredIds, uncertainIds, reviewingId: null },
    );
  }

  function createPracticeSet(range: PracticeSetRange, size: number, rangeLabel: string) {
    const pool = practicePoolFor(range);
    if (!pool.length) return;
    const actualSize = Math.min(size, pool.length);
    const label = `${subjectName}｜${rangeLabel}｜共 ${actualSize} 題`;
    createSet(pool, size, label);
    if (pool.length < size) setNotice(`目前條件只有 ${pool.length} 題，已全部納入練習集`);
    resetQuestionCursor();
  }

  function chooseSetAnswer(index: number) {
    if (!currentSetQuestion || currentSetQuestion.format === "申論題") return;
    recordAnswer(currentSetQuestion, index);
    markCompleted(currentSetQuestion.id);
  }

  function markSetEssayRead() {
    if (!currentSetQuestion || currentSetQuestion.format !== "申論題") return;
    recordEssayRead(currentSetQuestion);
    markCompleted(currentSetQuestion.id);
  }

  function moveSetQuestion(direction: 1 | -1) {
    pendingQuestionScrollRef.current = true;
    moveCursor(direction);
  }

  // ---- 模擬考 ----

  function submitMockExam(auto: boolean) {
    mock.submitExam();
    if (auto) setNotice("考試時間到，已自動交卷");
  }

  // 回練習模式檢視指定題目（含解析）：供模擬考錯題清單、法條頁與同法條關聯題使用。
  function openQuestionInPractice(question: Question) {
    pendingQuestionScrollRef.current = true;
    setSelectedSubjects([question.subject]);
    setSelectedCorpora([]);
    setFormatFilter(question.format === "申論題" ? "申論題" : "選擇題");
    setSelectedYears([]);
    setSelectedCategories([]);
    setScope("all");
    setReviewingId(null);
    setCurrentId(question.id);
    setView("practice");
  }

  // 搜尋結果跳題：保留科目、來源、年度與題型篩選，但離開錯題本／未作答範圍，
  // 確保目標題目會出現在清單中。
  function jumpToQuestion(entry: SearchEntry) {
    setView("practice");
    setScope("all");
    setReviewingId(null);
    setCurrentId(entry.id);
  }

  function startView(nextView: View) {
    resetQuestionCursor();
    setView(nextView);
    setMobileMenuOpen(false);
    if (nextView === "wrong") setScope("wrong");
    if (nextView === "practice" && scope === "wrong") setScope("all");
  }

  // 恢復上次練習的畫面、篩選與最後檢視題目。
  function resumeLastSession() {
    const offer = resumeOffer;
    setResumeOffer(null);
    if (!offer) return;
    const { session } = offer;
    setScope((session.scope as Scope) ?? "all");
    setSelectedSubjects((session.subjects as SubjectFilter[]) ?? []);
    setSelectedCorpora((session.corpora as Corpus[]) ?? []);
    setFormatFilter((session.format as FormatFilter) ?? "全部題型");
    setSelectedYears(session.years ?? []);
    setSelectedCategories(session.categories ?? []);
    setView(session.view === "wrong" ? "wrong" : "practice");
    setReviewingId(null);
    setCurrentId(offer.questionId ?? null);
  }

  function dismissResume() {
    setResumeOffer(null);
    updatePreferences({ lastSession: undefined });
  }

  // 深淺色主題：未設定→深色→淺色→回到跟隨系統。
  function cycleTheme() {
    const current = preferences.theme;
    const next = current === undefined ? "dark" : current === "dark" ? "light" : undefined;
    updatePreferences({ theme: next });
    if (next) document.documentElement.dataset.theme = next;
    else delete document.documentElement.dataset.theme;
  }

  // 間隔複習入口：切到練習畫面的「到期複習」範圍。
  function startDueReview() {
    resetQuestionCursor();
    setView("practice");
    setScope("due");
  }

  // 每日一題入口：切到該科練習並跳到今日題目（題庫載入完成後定位）。
  function openDailyQuestion() {
    resetQuestionCursor();
    setView("practice");
    setScope("all");
    setSelectedSubjects([todayPointer.subject]);
    setSelectedCorpora([]);
    setFormatFilter("選擇題");
    setSelectedYears([]);
    setSelectedCategories([]);
    setPendingDailyJump(true);
  }

  function clearFilters() {
    resetQuestionCursor();
    setScope("all");
    setSelectedSubjects([]);
    setSelectedCorpora([]);
    setFormatFilter("全部題型");
    setSelectedYears([]);
    setSelectedCategories([]);
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

  const subjectName = selectedSubjects.length === 0
    ? "全科"
    : selectedSubjects.length <= 2
      ? selectedSubjects.map((subject) => subjectLabels[subject]).join("＋")
      : `${selectedSubjects.length}科`;
  const hasActiveFilters =
    scope !== "all" ||
    selectedSubjects.length > 0 ||
    selectedCorpora.length > 0 ||
    formatFilter !== "全部題型" ||
    selectedYears.length > 0 ||
    selectedCategories.length > 0;
  return (
    <main className="app-shell">
      <OfflineNotice />
      <header className="topbar">
        <button className="brand" onClick={() => startView("about")}>
          <span className="brand-mark">法</span>
          <span>
            <strong>書記官法科研習室</strong>
            <small>法院書記官法科考古題練習</small>
          </span>
        </button>
        <div className="topbar-right">
          <button
            type="button"
            className="theme-toggle"
            onClick={cycleTheme}
            aria-label="切換深淺色主題"
            title="切換深淺色主題（跟隨系統／深色／淺色）"
          >
            <span aria-hidden="true">
              {preferences.theme === "dark" ? "🌙" : preferences.theme === "light" ? "☀️" : "🌗"}
            </span>
            <span className="theme-label">
              {preferences.theme === "dark" ? "深色" : preferences.theme === "light" ? "淺色" : "系統"}
            </span>
          </button>
          <div className="top-progress" aria-label="整體進度">
            <span>{visibleAnsweredCount} / {visibleQuestions.length} 題已完成</span>
            <div className="progress-track">
              <i style={{ width: `${visibleQuestions.length ? (visibleAnsweredCount / visibleQuestions.length) * 100 : 0}%` }} />
            </div>
          </div>
          <button
            type="button"
            className={`menu-toggle${mobileMenuOpen ? " open" : ""}`}
            aria-label={mobileMenuOpen ? "關閉主要功能選單" : "開啟主要功能選單"}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <i /><i /><i />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="menu-backdrop"
          aria-label="關閉主要功能選單"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="workspace">
        <aside className={`sidebar${mobileMenuOpen ? " menu-open" : ""}`}>
          <nav id="primary-navigation" aria-label="主要功能">
            {(Object.keys(viewLabels) as View[]).map((item, index) => (
              <button
                key={item}
                className={view === item ? "nav-item active" : "nav-item"}
                onClick={() => startView(item)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
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

          <ExamCountdownCard
            examDate={progress.examDate}
            remainingQuestions={Math.max(
              0,
              officialQuestionCount -
                answeredIds.length,
            )}
            onSet={(date) => setExamDate(date)}
            onClear={() => setExamDate(undefined)}
          />

          <section className="sidebar-card daily-card" aria-label="每日一題">
            <p className="eyebrow">每日一題</p>
            <strong>{progress.dailyQuestion?.streak ?? 0} 天</strong>
            <span>連續完成</span>
            <button type="button" onClick={openDailyQuestion} disabled={dailyCompletedToday}>
              {dailyCompletedToday ? "今日已完成" : "作答今日題目"}
            </button>
          </section>

          <section className="sidebar-card review-queue" aria-label="間隔複習佇列">
            <p className="eyebrow">複習佇列</p>
            <div className="review-queue-actions">
              <button type="button" onClick={startDueReview} disabled={reviewQueue.dueToday.length === 0}>
                今日到期 <b>{reviewQueue.dueToday.length}</b>
              </button>
              <button type="button" onClick={startDueReview} disabled={reviewQueue.overdue.length === 0}>
                逾期複習 <b>{reviewQueue.overdue.length}</b>
              </button>
            </div>
            <span className="review-queue-note">答錯隔天複習；連續答對依 3、7、14、30 天延後</span>
          </section>

          <div className="storage-note">
            <span>LOCAL</span>
            紀錄只保存在這台裝置的瀏覽器
          </div>
        </aside>

        <section className="content">
          {view === "about" ? (
            <IntroductionView
              officialQuestionCount={officialQuestionCount}
              answeredCount={answeredIds.length}
              wrongCount={wrongIds.length}
              onStartPractice={() => startView("practice")}
            />
          ) : view === "stats" ? (
            <StatsView
              questions={questions}
              progress={progress}
              accuracy={accuracy}
              attemptAccuracy={attemptAccuracy}
              wrongCount={wrongIds.length}
              answeredCount={answeredIds.length}
              dueIds={dueIds}
              onExport={exportProgress}
              onImport={() => importRef.current?.click()}
              onReset={resetProgress}
            />
          ) : view === "mock" ? (
            <MockExamView
              mockExam={mock.mockExam}
              questions={questions}
              loading={bankLoading}
              onStart={mock.startExam}
              onSelect={mock.selectAnswer}
              onJump={mock.jumpToIndex}
              onSubmit={submitMockExam}
              onDismiss={mock.discardExam}
              onReviewQuestion={openQuestionInPractice}
            />
          ) : view === "law" ? (
            <LawBrowserView
              questions={questions}
              statuteCards={progress.statuteCards}
              onGradeCard={gradeStatuteCard}
              onOpenQuestion={openQuestionInPractice}
            />
          ) : view === "practice" && practiceSet ? (
            <PracticeSetSession
              practiceSet={practiceSet}
              questions={practiceSetQuestions}
              progress={progress}
              loading={bankLoading}
              shuffleOptions={preferences.shuffleOptions ?? false}
              onChoose={chooseSetAnswer}
              onMarkRead={markSetEssayRead}
              onMove={moveSetQuestion}
              onLeave={leaveSet}
            />
          ) : (
            <>
              {resumeOffer && view === "practice" && (
                <div className="resume-banner" role="status">
                  <span>已保存上次的練習位置與篩選條件，要接著練嗎？</span>
                  <div>
                    <button type="button" onClick={resumeLastSession}>繼續上次練習</button>
                    <button type="button" onClick={dismissResume}>重新開始</button>
                  </div>
                </div>
              )}

              <SearchPanel
                filters={{
                  view,
                  scope,
                  subjects: selectedSubjects,
                  corpora: selectedCorpora,
                  format: formatFilter,
                  years: selectedYears,
                  categories: selectedCategories,
                }}
                onJump={jumpToQuestion}
                onClearFilters={clearFilters}
              />

              <FiltersBar
                scope={scope}
                subjects={selectedSubjects}
                corpora={selectedCorpora}
                format={formatFilter}
                years={selectedYears}
                categories={selectedCategories}
                matchCount={visibleQuestions.length}
                hasActiveFilters={hasActiveFilters}
                shuffleOptions={preferences.shuffleOptions ?? false}
                shuffleQuestions={preferences.shuffleQuestions ?? false}
                onScopeChange={(value) => {
                  resetQuestionCursor();
                  setScope(value);
                }}
                onSubjectsChange={(values) => {
                  resetQuestionCursor();
                  setSelectedSubjects(values);
                  // 章節篩選依附於單一科目，科目一變就重設，避免殘留無效章節。
                  setSelectedCategories([]);
                }}
                onCorporaChange={(values) => {
                  resetQuestionCursor();
                  setSelectedCorpora(values);
                }}
                onFormatChange={(value) => {
                  resetQuestionCursor();
                  setFormatFilter(value);
                }}
                onYearsChange={(values) => {
                  resetQuestionCursor();
                  setSelectedYears(values);
                }}
                onCategoriesChange={(values) => {
                  resetQuestionCursor();
                  setSelectedCategories(values);
                }}
                onShuffleChange={(enabled) => updatePreferences({ shuffleOptions: enabled })}
                onShuffleQuestionsChange={(enabled) => {
                  updatePreferences({ shuffleQuestions: enabled });
                  // 開啟時抽一組全新的加密級隨機順序並回到第一題，讓亂序立即可感知。
                  if (enabled) {
                    setQuestionShuffleSeed(randomShuffleSeed());
                    resetQuestionCursor();
                  }
                }}
                onReshuffle={() => {
                  setQuestionShuffleSeed(randomShuffleSeed());
                  resetQuestionCursor();
                }}
                onClearFilters={clearFilters}
              />

              {view === "practice" && (
                <PracticeSetCreator
                  poolCounts={{
                    all: practicePoolFor("all").length,
                    unanswered: practicePoolFor("unanswered").length,
                    wrong: practicePoolFor("wrong").length,
                    due: practicePoolFor("due").length,
                    starred: practicePoolFor("starred").length,
                  }}
                  onCreate={createPracticeSet}
                />
              )}

              {bankError ? (
                <div className="empty-state" role="alert">
                  <span>!</span>
                  <h2>題庫載入失敗</h2>
                  <p>請確認網路連線後重試；本機作答紀錄不受影響。</p>
                  {/* Turbopack 會快取失敗的動態 import，重新整理是可靠的復原方式。 */}
                  <button onClick={() => window.location.reload()}>重試載入</button>
                </div>
              ) : bankLoading ? (
                <div className="empty-state" aria-live="polite">
                  <span>…</span>
                  <h2>題庫載入中</h2>
                  <p>正在載入所選科目的題目與解析，通常只需要一下子。</p>
                </div>
              ) : currentQuestion ? (
                <QuestionCard
                  // key 含 view 與 scope：切換錯題本／未作答等畫面時重置作答狀態，
                  // 讓剛答錯的題目進錯題本後可以立即重新作答。
                  key={`${view}-${scope}-${currentQuestion.id}`}
                  question={currentQuestion}
                  position={orderedVisibleQuestions.findIndex((item) => item.id === currentQuestion.id) + 1}
                  total={visibleQuestions.length}
                  previousAnswer={progress.answers[currentQuestion.id]}
                  relatedQuestions={currentRelatedQuestions}
                  availableQuestions={questions}
                  shuffleOptions={preferences.shuffleOptions ?? false}
                  flags={progress.flags[currentQuestion.id]}
                  onChoose={chooseAnswer}
                  onMarkRead={markEssayRead}
                  onMove={moveQuestion}
                  onOpenRelated={openQuestionInPractice}
                  onToggleStarred={() => toggleStarred(currentQuestion.id)}
                  onToggleUncertain={() => toggleUncertain(currentQuestion.id)}
                  essay={progress.essays?.[currentQuestion.id]}
                  onSaveEssay={(draft, seconds) => {
                    saveEssayDraft(currentQuestion.id, draft, seconds);
                    setNotice("申論草稿已保存於本機");
                  }}
                />
              ) : (
                <div className="empty-state">
                  <span>✓</span>
                  <h2>{view === "wrong" ? "錯題已全部清空" : "這個篩選目前沒有題目"}</h2>
                  <p>{view === "wrong" ? "答對後會自動離開錯題本，繼續保持。" : "換一個年度、題型或切回全部題目看看。"}</p>
                  <button onClick={() => { setScope("all"); setSelectedSubjects(["civil-law"]); setSelectedCorpora(["司法特考四等"]); setFormatFilter("選擇題"); setSelectedYears([]); setSelectedCategories([]); startView("practice"); }}>
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
