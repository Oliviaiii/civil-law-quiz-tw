"use client";

/** 以 details/summary 呈現的複選篩選器，選滿全部選項時視為不設限（回傳空陣列）。 */
export function MultiSelectFilter<T extends string | number>({
  ariaLabel,
  className = "",
  allLabel,
  options,
  selected,
  summary,
  onChange,
}: {
  ariaLabel: string;
  className?: string;
  allLabel: string;
  options: { value: T; label: string }[];
  selected: T[];
  summary: string;
  onChange: (values: T[]) => void;
}) {
  function toggle(value: T) {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(next.length === options.length ? [] : next);
  }

  return (
    <details className={`multi-select ${className}`}>
      <summary aria-label={ariaLabel}>{summary}</summary>
      <div className="multi-select-menu">
        <button
          type="button"
          className={selected.length === 0 ? "all-option selected" : "all-option"}
          onClick={() => onChange([])}
        >
          {allLabel}
          {selected.length === 0 && <span>✓</span>}
        </button>
        <div className="multi-select-options">
          {options.map((option) => (
            <label key={String(option.value)}>
              <input
                type="checkbox"
                value={option.value}
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          className="multi-select-done"
          onClick={(event) => {
            const details = event.currentTarget.closest("details");
            if (details) details.open = false;
          }}
        >
          完成
        </button>
      </div>
    </details>
  );
}
