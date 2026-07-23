import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

// 獨立於產生器重算章節層級統計，防止產生器與規格漂移。
// 規則：主要＋次要爭點合併計章、同題同章只計一次、同年多題只計一個出現年度；
// 分母由實際題目資料推導（收錄年度數、收錄申論題數）。
async function deriveExpected() {
  const [civil, criminal, remaining, taxonomy, ...annotationSources] = await Promise.all([
    readJson("../app/data/judicial-fourth-questions.json"),
    readJson("../app/data/criminal-law-questions.json"),
    readJson("../app/data/clerk-remaining-questions.json"),
    readJson("../app/data/essay-issues/taxonomy.json"),
    readJson("../app/data/essay-issues/civil-law.json"),
    readJson("../app/data/essay-issues/criminal-law.json"),
    readJson("../app/data/essay-issues/administrative-law.json"),
    readJson("../app/data/essay-issues/civil-procedure.json"),
    readJson("../app/data/essay-issues/criminal-procedure.json"),
  ]);
  const annotations = Object.assign({}, ...annotationSources);

  const meta = [];
  const pushMeta = (record, key) => {
    if (record.format !== "申論題") return;
    meta.push({ id: record.id, key, rocYear: record.rocYear });
  };
  for (const record of civil) pushMeta(record, "civil");
  for (const record of criminal) pushMeta(record, "criminal");
  for (const record of remaining) {
    if (record.format !== "申論題") continue;
    if (record.studySubject === "administrative-law") pushMeta(record, "administrative");
    else if (record.studySubject === "civil-procedure") pushMeta(record, "civil-procedure");
    else if (record.studySubject === "criminal-procedure") pushMeta(record, "criminal-procedure");
  }

  const subjects = {};
  const order = ["civil", "criminal", "administrative", "civil-procedure", "criminal-procedure"];
  for (const key of order) {
    const questions = meta.filter((question) => question.key === key);
    const years = [...new Set(questions.map((question) => question.rocYear))].sort((a, b) => a - b);
    const chapters = new Map(); // chapter -> Map(year -> Set(id))
    for (const question of questions) {
      const annotation = annotations[question.id];
      const primary = new Set(annotation.primaryIssueIds.map((id) => id.split(".")[1]));
      const secondary = new Set(annotation.secondaryIssueIds.map((id) => id.split(".")[1]));
      for (const chapter of new Set([...primary, ...secondary])) {
        if (!chapters.has(chapter)) chapters.set(chapter, new Map());
        const yearMap = chapters.get(chapter);
        if (!yearMap.has(question.rocYear)) yearMap.set(question.rocYear, new Set());
        yearMap.get(question.rocYear).add(question.id);
      }
    }
    subjects[key] = { years, chapters };
  }
  return { subjects, taxonomy };
}

function chapterTotals(subject, chapter) {
  const yearMap = subject.chapters.get(chapter);
  const years = [...yearMap.keys()].sort((a, b) => a - b);
  const questionCount = years.reduce((sum, year) => sum + yearMap.get(year).size, 0);
  return { years, coverage: years.length, questionCount };
}

test("administrative-law chapter frequencies match the issue's worked example", async () => {
  const { subjects } = await deriveExpected();
  const administrative = subjects.administrative;
  const totalYears = administrative.years.length;
  const totalEssays = 28;

  assert.equal(totalYears, 7, "行政法應收錄 108–114 共 7 年");

  const act = chapterTotals(administrative, "act");
  assert.deepEqual(act.years, [108, 109, 110, 111, 113]);
  assert.equal(act.coverage, 5, "行政處分年度覆蓋應為 5 年");
  assert.equal(act.questionCount, 7, "行政處分題數應為 7 題");
  assert.equal(`${act.coverage}／${totalYears}`, "5／7");
  assert.equal(`${act.questionCount}／${totalEssays}`, "7／28");

  const stateLiability = chapterTotals(administrative, "state-liability");
  assert.deepEqual(stateLiability.years, [111, 113, 114]);
  assert.equal(stateLiability.coverage, 3, "國家賠償年度覆蓋應為 3 年");
  assert.equal(stateLiability.questionCount, 3, "國家賠償題數應為 3 題");
});

test("never double-counts a question within a chapter or a year within coverage", async () => {
  const { subjects, taxonomy } = await deriveExpected();
  for (const [key, subject] of Object.entries(subjects)) {
    for (const [chapter, yearMap] of subject.chapters) {
      // 章節名稱必須存在於統一分類。
      assert.ok(
        taxonomy.chapters[key]?.[chapter],
        `${key}.${chapter} 未在統一分類中`,
      );
      const seen = new Set();
      for (const [year, ids] of yearMap) {
        // 同一年度的題目集合去重（同年多題不重複計年度：一個 year 一筆）。
        assert.ok(ids.size >= 1);
        for (const id of ids) {
          const compositeKey = `${chapter}|${id}`;
          assert.equal(seen.has(compositeKey), false, `${compositeKey} 同題同章重複計數`);
          seen.add(compositeKey);
          // 一題只屬於一個年度。
          for (const [otherYear, otherIds] of yearMap) {
            if (otherYear === year) continue;
            assert.equal(otherIds.has(id), false, `${id} 出現在多個年度`);
          }
        }
      }
    }
  }
});

test("selecting a narrower year range recomputes numerator and denominator", async () => {
  const { subjects } = await deriveExpected();
  const administrative = subjects.administrative;
  const [fromYear, toYear] = [110, 114];
  const inRange = (year) => year >= fromYear && year <= toYear;
  const yearsInRange = administrative.years.filter(inRange);
  assert.deepEqual(yearsInRange, [110, 111, 112, 113, 114]);
  const totalEssaysInRange = yearsInRange.length * 4; // 行政法每年 4 題
  assert.equal(totalEssaysInRange, 20);

  const yearMap = administrative.chapters.get("act");
  const appeared = [...yearMap.keys()].filter(inRange).sort((a, b) => a - b);
  const questionCount = appeared.reduce((sum, year) => sum + yearMap.get(year).size, 0);
  assert.deepEqual(appeared, [110, 111, 113]);
  assert.equal(`${appeared.length}／${yearsInRange.length}`, "3／5"); // 年度覆蓋率
  assert.equal(`${questionCount}／${totalEssaysInRange}`, "5／20"); // 題目占比
});

test("generated essay-issue-stats.json matches the independent derivation", async () => {
  const [{ subjects, taxonomy }, generated] = await Promise.all([
    deriveExpected(),
    readJson("../public/data/essay-issue-stats.json"),
  ]);

  assert.equal(generated.reviewStatus, "draft");
  assert.equal(generated.subjects.length, 5);
  assert.deepEqual(
    generated.subjects.map((subject) => subject.key),
    ["civil", "criminal", "administrative", "civil-procedure", "criminal-procedure"],
  );

  for (const subject of generated.subjects) {
    const expected = subjects[subject.key];
    assert.deepEqual(subject.years, expected.years, `${subject.key} 收錄年度不一致`);
    // 收錄申論題總數＝各年度題數合計。
    const essayTotal = Object.values(subject.essayCountsByYear).reduce((a, b) => a + b, 0);
    assert.ok(essayTotal > 0);

    assert.equal(
      subject.chapters.length,
      expected.chapters.size,
      `${subject.key} 章節數不一致`,
    );
    for (const chapter of subject.chapters) {
      assert.equal(
        chapter.label,
        taxonomy.chapters[subject.key][chapter.chapter],
        `${subject.key}.${chapter.chapter} 顯示名稱與分類不符`,
      );
      const expectedYearMap = expected.chapters.get(chapter.chapter);
      assert.ok(expectedYearMap, `${subject.key}.${chapter.chapter} 不在推導結果中`);
      for (const entry of chapter.questionsByYear) {
        const expectedIds = expectedYearMap.get(entry.year);
        assert.ok(expectedIds, `${subject.key}.${chapter.chapter} 年度 ${entry.year} 不一致`);
        assert.deepEqual(
          new Set(entry.questions.map((question) => question.id)),
          expectedIds,
          `${subject.key}.${chapter.chapter} ${entry.year} 年題目集合不一致`,
        );
        // 每筆題目都能回查官方來源並標明主／次爭點。
        for (const question of entry.questions) {
          assert.ok(question.sourceUrl.includes("wwwq.moex.gov.tw"), `${question.id} 缺官方來源`);
          assert.ok(["primary", "secondary"].includes(question.match));
          assert.ok(question.gist.length >= 10);
        }
      }
    }
  }

  // 行政法工作範例再次以產生檔驗證。
  const administrative = generated.subjects.find((subject) => subject.key === "administrative");
  const act = administrative.chapters.find((chapter) => chapter.chapter === "act");
  assert.deepEqual(act.questionsByYear.map((entry) => entry.year), [108, 109, 110, 111, 113]);
  assert.equal(
    act.questionsByYear.reduce((sum, entry) => sum + entry.questions.length, 0),
    7,
  );
});
