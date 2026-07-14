"use client";

import { useEffect, useMemo, useState } from "react";
import type { Question } from "../data/questions";
import { compareQuestions } from "../lib/question-order";
import { subjectOptions, type SubjectFilter } from "../lib/quiz-filters";

// 各科題庫以動態 import 依需載入：Next 會把每個 bank 拆成獨立、帶內容 hash 的
// chunk（共用同一份試卷 JSON 的科目共用 chunk），首頁 bundle 不含題庫內容，
// GitHub Pages 子路徑也由框架自動處理。
const loaders: Record<SubjectFilter, () => Promise<{ bank: Question[] }>> = {
  "civil-law": () => import("../data/banks/civil-law"),
  "criminal-law": () => import("../data/banks/criminal-law"),
  constitution: () => import("../data/banks/constitution"),
  "legal-introduction": () => import("../data/banks/legal-introduction"),
  english: () => import("../data/banks/english"),
  chinese: () => import("../data/banks/chinese"),
  "administrative-law": () => import("../data/banks/administrative-law"),
  "civil-procedure": () => import("../data/banks/civil-procedure"),
  "criminal-procedure": () => import("../data/banks/criminal-procedure"),
};

const allSubjects = subjectOptions.map((option) => option.value);

// 題庫是不可變的靜態資料，載入後以模組層級快取供整個瀏覽階段共用。
const bankCache = new Map<SubjectFilter, Question[]>();

/**
 * 載入指定科目的題庫（空陣列代表全部科目）。
 * 回傳合併後維持全站順序的題目、載入中與載入失敗狀態。
 */
export function useQuestionBank(subjects: SubjectFilter[]) {
  const wanted = subjects.length ? subjects : allSubjects;
  const wantedKey = wanted.join(",");
  const [loadedCount, setLoadedCount] = useState(bankCache.size);
  const [failedSubjects, setFailedSubjects] = useState<SubjectFilter[]>([]);

  useEffect(() => {
    let cancelled = false;
    const missing = wanted.filter((subject) => !bankCache.has(subject));
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (subject) => {
        try {
          const loaded = await loaders[subject]();
          return { subject, bank: loaded.bank };
        } catch {
          return { subject, bank: null };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const failed: SubjectFilter[] = [];
      for (const result of results) {
        if (result.bank) bankCache.set(result.subject, result.bank);
        else failed.push(result.subject);
      }
      setLoadedCount(bankCache.size);
      setFailedSubjects(failed);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wantedKey 已代表 wanted 的內容
  }, [wantedKey]);

  const allLoaded = wanted.every((subject) => bankCache.has(subject));
  const questions = useMemo(() => {
    if (!allLoaded) return [];
    return wanted
      .flatMap((subject) => bankCache.get(subject) ?? [])
      .sort(compareQuestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 快取只增不減，loadedCount 代表其版本
  }, [allLoaded, wantedKey, loadedCount]);

  const error = failedSubjects.length > 0;
  return {
    questions,
    loading: !allLoaded && !error,
    error,
  };
}
