import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const annotationFiles = [
  "civil-law",
  "criminal-law",
  "administrative-law",
  "civil-procedure",
  "criminal-procedure",
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

async function loadEssayData() {
  const [civil, criminal, remaining, taxonomy, ...annotationSources] = await Promise.all([
    readJson("../app/data/judicial-fourth-questions.json"),
    readJson("../app/data/criminal-law-questions.json"),
    readJson("../app/data/clerk-remaining-questions.json"),
    readJson("../app/data/essay-issues/taxonomy.json"),
    ...annotationFiles.map((name) => readJson(`../app/data/essay-issues/${name}.json`)),
  ]);
  const officialEssays = [...civil, ...criminal, ...remaining].filter(
    (question) =>
      question.format === "申論題" &&
      question.studySubject !== "chinese",
  );
  const annotationEntries = annotationSources.flatMap((source) => Object.entries(source));
  return { officialEssays, taxonomy, annotationEntries };
}

test("covers all 120 official clerk legal essays exactly once", async () => {
  const { officialEssays, annotationEntries } = await loadEssayData();
  const officialIds = officialEssays.map((question) => question.id).sort();
  const annotationIds = annotationEntries.map(([questionId]) => questionId).sort();

  assert.equal(officialEssays.length, 120);
  assert.equal(annotationEntries.length, 120);
  assert.equal(new Set(annotationIds).size, 120);
  assert.deepEqual(annotationIds, officialIds);

  const counts = Object.fromEntries(
    ["民法概要", "刑法", "administrative-law", "civil-procedure", "criminal-procedure"].map(
      (subject) => [
        subject,
        officialEssays.filter(
          (question) => (question.studySubject ?? question.subject) === subject,
        ).length,
      ],
    ),
  );
  assert.deepEqual(counts, {
    民法概要: 26,
    刑法: 26,
    "administrative-law": 28,
    "civil-procedure": 20,
    "criminal-procedure": 20,
  });
  assert.ok(
    officialEssays.every(
      (question) =>
        question.sourceUrl.includes("wwwq.moex.gov.tw") &&
        question.prompt.length >= 20 &&
        /\d+\s*分/.test(question.prompt),
    ),
  );
});

test("keeps every essay annotation substantive, traceable, and explicitly draft until human review", async () => {
  const { annotationEntries } = await loadEssayData();
  const gists = new Set();

  for (const [questionId, annotation] of annotationEntries) {
    assert.ok(annotation.gist.length >= 24, `${questionId}: 命題主旨過短`);
    assert.ok(!gists.has(annotation.gist), `${questionId}: 命題主旨與其他題重複`);
    gists.add(annotation.gist);
    assert.ok(annotation.primaryIssueIds.length >= 1, `${questionId}: 缺少主要爭點`);
    assert.equal(
      new Set(annotation.primaryIssueIds).size,
      annotation.primaryIssueIds.length,
      `${questionId}: 主要爭點重複`,
    );
    assert.equal(
      new Set(annotation.secondaryIssueIds).size,
      annotation.secondaryIssueIds.length,
      `${questionId}: 次要爭點重複`,
    );
    assert.ok(["low", "medium", "high"].includes(annotation.confidence));
    assert.equal(annotation.reviewStatus, "draft");
    assert.ok(Array.isArray(annotation.references));
    assert.ok(annotation.lawVersionNote === null || annotation.lawVersionNote.length >= 20);
    assert.ok(Array.isArray(annotation.subparts));
    for (const subpart of annotation.subparts) {
      assert.ok(subpart.label.length >= 2);
      assert.ok(subpart.issueIds.length >= 1);
    }
    assert.equal("answer" in annotation, false);
    assert.equal("modelAnswer" in annotation, false);
  }
});

test("places every primary, secondary, and subpart issue in the controlled taxonomy", async () => {
  const { taxonomy, annotationEntries } = await loadEssayData();
  assert.equal(taxonomy.version, 1);

  for (const [questionId, annotation] of annotationEntries) {
    const issueIds = new Set([
      ...annotation.primaryIssueIds,
      ...annotation.secondaryIssueIds,
      ...annotation.subparts.flatMap((subpart) => subpart.issueIds),
    ]);
    for (const issueId of issueIds) {
      const [root, chapter, ...leaf] = issueId.split(".");
      assert.ok(taxonomy.subjects[root], `${questionId}: 未知爭點科目 ${issueId}`);
      assert.ok(taxonomy.chapters[root]?.[chapter], `${questionId}: 未知爭點章節 ${issueId}`);
      assert.ok(leaf.join(".").length >= 3, `${questionId}: 爭點葉節點不完整 ${issueId}`);
    }
  }
});

test("counts one occurrence per official question and issue", async () => {
  const { annotationEntries } = await loadEssayData();
  const occurrences = new Set();

  for (const [questionId, annotation] of annotationEntries) {
    const issueIds = new Set([
      ...annotation.primaryIssueIds,
      ...annotation.secondaryIssueIds,
      ...annotation.subparts.flatMap((subpart) => subpart.issueIds),
    ]);
    for (const issueId of issueIds) {
      const key = `${questionId}|${issueId}`;
      assert.equal(occurrences.has(key), false);
      occurrences.add(key);
    }
  }
  assert.ok(occurrences.size > annotationEntries.length);
});

test("keeps the visually verified 112 administrative-law paper split into four complete questions", async () => {
  const remaining = await readJson("../app/data/clerk-remaining-questions.json");
  const questions = remaining.filter(
    (question) =>
      question.studySubject === "administrative-law" &&
      question.rocYear === 112 &&
      question.format === "申論題",
  );

  assert.equal(questions.length, 4);
  assert.match(questions[0].prompt, /^A 國立大學教師甲/);
  assert.match(questions[1].prompt, /^甲為 A 大學之專任教師/);
  assert.match(questions[1].prompt, /附錄教師法條文/);
  assert.match(questions[2].prompt, /^甲為 A 警察局轄下某分局之警員/);
  assert.match(questions[2].prompt, /附錄公務人員保障法條文/);
  assert.match(questions[3].prompt, /^甲為私立高級商業職業學校/);
  assert.match(questions[3].prompt, /附錄私立學校法條文/);
  assert.ok(questions.every((question) => /25\s*分/.test(question.prompt)));
});
