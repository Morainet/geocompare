import { useRef, type RefObject } from "react";

interface CompareDividerProps {
  container: RefObject<HTMLDivElement | null>;
  position: number;
  onChange(position: number): void;
}

export function CompareDivider({ container, position, onChange }: CompareDividerProps) {
  const dragStart = useRef<number | null>(null);
  const percentage = Math.round(position * 100);

  const updateFromPointer = (clientX: number) => {
    const bounds = container.current?.getBoundingClientRect();
    if (bounds?.width) onChange(Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width)));
  };

  return (
    <div
      className="geocompare-divider"
      role="slider"
      tabIndex={0}
      aria-label="Comparison position"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      aria-valuetext={`${percentage}% earlier imagery, ${100 - percentage}% later imagery`}
      style={{ left: `${position * 100}%` }}
      onPointerDown={(event) => {
        dragStart.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragStart.current === event.pointerId) updateFromPointer(event.clientX);
      }}
      onPointerUp={() => { dragStart.current = null; }}
      onPointerCancel={() => { dragStart.current = null; }}
      onKeyDown={(event) => {
        let next: number;
        switch (event.key) {
          case "ArrowLeft": next = position - 0.01; break;
          case "ArrowRight": next = position + 0.01; break;
          case "PageDown": next = position - 0.1; break;
          case "PageUp": next = position + 0.1; break;
          case "Home": next = 0; break;
          case "End": next = 1; break;
          default: return;
        }
        event.preventDefault();
        onChange(Math.min(1, Math.max(0, Math.round(next * 100) / 100)));
      }}
    >
      <span aria-hidden="true">↔</span>
    </div>
  );
}
