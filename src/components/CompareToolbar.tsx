import type { CompareMode } from "../core/types";

interface CompareToolbarProps {
  mode: CompareMode;
  onChange(mode: CompareMode): void;
}

export function CompareToolbar({ mode, onChange }: CompareToolbarProps) {
  return (
    <div className="geocompare-toolbar" role="group" aria-label="Comparison mode">
      <button type="button" aria-pressed={mode === "swipe"} onClick={() => onChange("swipe")}>Swipe</button>
      <button type="button" aria-pressed={mode === "side-by-side"} onClick={() => onChange("side-by-side")}>Side by side</button>
    </div>
  );
}
