"use client";

import { localDateKey } from "../lib/progress-store";

const WEEKS = 16;

function intensityOf(count: number): number {
  if (count <= 0) return 0;
  if (count <= 4) return 1;
  if (count <= 9) return 2;
  return 3;
}

/** 近 16 週的每日作答量月曆熱力圖；只由本機 v3 progress.daily 計算。 */
export function ActivityHeatmap({ daily }: { daily: Record<string, number> }) {
  // 對齊到本週日結尾的完整週：由最舊的週日開始逐日排到今天。
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (WEEKS * 7 - 1) - today.getDay());

  const cells: { key: string; count: number; future: boolean }[] = [];
  const cursor = new Date(start);
  const todayKey = localDateKey(today);
  while (cells.length < WEEKS * 7 + today.getDay() + 1) {
    const key = localDateKey(cursor);
    cells.push({ key, count: daily[key] ?? 0, future: key > todayKey });
    if (key === todayKey) break;
    cursor.setDate(cursor.getDate() + 1);
  }

  return (
    <section className="activity-heatmap" aria-label="每日作答熱力圖">
      <div className="section-title">
        <div>
          <p className="eyebrow">ACTIVITY</p>
          <h2>每日作答熱力圖</h2>
        </div>
        <span>近 {WEEKS} 週</span>
      </div>
      <div className="heatmap-grid">
        {cells.map((cell) => (
          <i
            key={cell.key}
            className={`heatmap-cell level-${intensityOf(cell.count)}`}
            title={`${cell.key}：${cell.count} 題`}
          />
        ))}
      </div>
      <p className="stats-note">
        每日作答數自進度格式 v3（2026-07-14）啟用後開始累計，先前的作答沒有每日紀錄；
        資料只保存在這台裝置的瀏覽器。
      </p>
    </section>
  );
}
