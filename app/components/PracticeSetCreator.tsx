"use client";

import { useState } from "react";

const SIZE_PRESETS = [10, 25, 50];

export type PracticeSetRange = "all" | "unanswered" | "wrong" | "due" | "starred";

const rangeLabels: Record<PracticeSetRange, string> = {
  all: "全部",
  unanswered: "未作答",
  wrong: "曾答錯",
  due: "到期複習",
  starred: "收藏",
};

/** 從目前篩選結果建立隨機練習集：選範圍、選題數。 */
export function PracticeSetCreator({
  poolCounts,
  onCreate,
}: {
  poolCounts: Record<PracticeSetRange, number>;
  onCreate: (range: PracticeSetRange, size: number, rangeLabel: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<PracticeSetRange>("all");
  const [presetSize, setPresetSize] = useState(10);
  const [customSize, setCustomSize] = useState("");

  const poolCount = poolCounts[range];
  const requestedSize = customSize ? Number.parseInt(customSize, 10) : presetSize;
  const validSize = Number.isFinite(requestedSize) && requestedSize >= 1;
  const willTruncate = validSize && poolCount > 0 && poolCount < requestedSize;

  return (
    <div className="practice-set-creator">
      <button
        type="button"
        className="practice-set-toggle"
        onClick={() => setOpen((previous) => !previous)}
      >
        {open ? "收合練習集設定" : "建立練習集"}
      </button>
      {open && (
        <div className="practice-set-form">
          <div className="practice-set-field">
            <span>抽題範圍</span>
            <div className="segmented">
              {(Object.keys(rangeLabels) as PracticeSetRange[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={range === item ? "selected" : ""}
                  onClick={() => setRange(item)}
                >
                  {rangeLabels[item]} {poolCounts[item]} 題
                </button>
              ))}
            </div>
          </div>
          <div className="practice-set-field">
            <span>題數</span>
            <div className="segmented">
              {SIZE_PRESETS.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={!customSize && presetSize === size ? "selected" : ""}
                  onClick={() => {
                    setPresetSize(size);
                    setCustomSize("");
                  }}
                >
                  {size} 題
                </button>
              ))}
              <input
                type="number"
                min={1}
                placeholder="自訂"
                aria-label="自訂題數"
                value={customSize}
                onChange={(event) => setCustomSize(event.target.value)}
              />
            </div>
          </div>
          {poolCount === 0 && <p className="practice-set-note">此範圍目前沒有題目，請調整篩選或範圍。</p>}
          {willTruncate && (
            <p className="practice-set-note">目前條件只有 {poolCount} 題，會全部納入且不重複抽題。</p>
          )}
          <button
            type="button"
            className="practice-set-start"
            disabled={poolCount === 0 || !validSize}
            onClick={() => {
              setOpen(false);
              onCreate(range, requestedSize, rangeLabels[range]);
            }}
          >
            開始練習
          </button>
        </div>
      )}
    </div>
  );
}
