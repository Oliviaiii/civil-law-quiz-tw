"use client";

import { useEffect, useState } from "react";
import type { EssayPracticeState } from "../lib/progress-store";

const CHECKLIST = [
  "爭點：是否點出題目要處理的法律爭點？",
  "法條：是否引用正確條號並敘明要件？",
  "涵攝：是否把事實逐一套入要件、扣緊題目？",
  "結論：是否對每個小題給出明確結論？",
  "結構：前言、本論、結論的層次是否完整？",
];

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** 申論題自我練習：本機草稿、計時器與自我檢核清單；不提供任何 AI 擬答。 */
export function EssayPracticePanel({
  essay,
  onSave,
}: {
  essay?: EssayPracticeState;
  onSave: (draft: string, seconds: number) => void;
}) {
  const [draft, setDraft] = useState(essay?.draft ?? "");
  const [seconds, setSeconds] = useState(essay?.seconds ?? 0);
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map(() => false));

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <section className="essay-practice" aria-label="申論題自我練習">
      <div className="essay-practice-head">
        <p className="eyebrow">自我練習</p>
        <div className="essay-timer">
          <span aria-label="已用時間">已用時 {formatSeconds(seconds)}</span>
          <button type="button" onClick={() => setRunning((value) => !value)}>
            {running ? "暫停計時" : "開始計時"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setSeconds(0);
            }}
          >
            歸零
          </button>
        </div>
      </div>

      <label className="essay-draft">
        <span>作答草稿（僅保存在這台裝置的瀏覽器，隨學習紀錄匯出／匯入）</span>
        <textarea
          rows={8}
          aria-label="申論題作答草稿"
          placeholder="在此擬答：先列爭點與條號，再逐段涵攝……"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="essay-save"
        onClick={() => {
          setRunning(false);
          onSave(draft, seconds);
        }}
      >
        儲存草稿
      </button>

      <div className="essay-checklist">
        <p className="eyebrow">自我檢核</p>
        {CHECKLIST.map((item, index) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={checked[index]}
              onChange={() =>
                setChecked((previous) =>
                  previous.map((value, valueIndex) => (valueIndex === index ? !value : value)),
                )
              }
            />
            <span>{item}</span>
          </label>
        ))}
      </div>

      <p className="verification-note">
        考選部未提供申論題官方擬答；本站不自動產生、也不展示冒充官方答案的 AI 擬答，
        請以官方試卷、法條與教科書自行核對。
      </p>
    </section>
  );
}
