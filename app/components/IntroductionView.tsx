"use client";

/** 網站介紹獨立畫面：練習頁只保留搜尋、篩選與題目。 */
export function IntroductionView({
  officialQuestionCount,
  answeredCount,
  wrongCount,
  onStartPractice,
}: {
  officialQuestionCount: number;
  answeredCount: number;
  wrongCount: number;
  onStartPractice: () => void;
}) {
  return (
    <section className="introduction-view" aria-labelledby="introduction-title">
      <div className="introduction-hero">
        <div>
          <p className="eyebrow">ABOUT</p>
          <h1 id="introduction-title">近十年法院書記官法科考古題</h1>
          <p>
            收錄民國 105–114 年司法特考四等法院書記官九科官方試題；選擇題依考選部答案判定，
            作文、公文與法科申論題保留原題供閱讀與標記。
          </p>
          <button type="button" className="introduction-start" onClick={onStartPractice}>
            開始練習
          </button>
        </div>
        <div className="introduction-mark" aria-hidden="true">法</div>
      </div>

      <div className="introduction-stats" aria-label="題庫與學習摘要">
        <div><strong>{officialQuestionCount}</strong><span>官方考古題</span></div>
        <div><strong>9</strong><span>考試科目</span></div>
        <div><strong>{answeredCount}</strong><span>已完成題目</span></div>
        <div><strong>{wrongCount}</strong><span>待複習錯題</span></div>
      </div>

      <div className="introduction-features">
        <article>
          <span>01</span>
          <h2>依需求組合題目</h2>
          <p>可依作答狀態、科目、題庫來源、題型、年度與民法章節篩選。</p>
        </article>
        <article>
          <span>02</span>
          <h2>作答後立即複習</h2>
          <p>保留官方答案、法律依據與解析，並支援錯題、收藏及不確定標記。</p>
        </article>
        <article>
          <span>03</span>
          <h2>紀錄留在本機</h2>
          <p>學習進度只保存在目前裝置的瀏覽器，也可自行匯出備份。</p>
        </article>
      </div>
    </section>
  );
}
