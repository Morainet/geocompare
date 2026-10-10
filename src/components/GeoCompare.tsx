import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useComparisonMaps } from "../adapters/maplibre/useComparisonMaps";
import { validateImage, validatePosition } from "../core/config";
import { exportComparisonConfig } from "../core/comparisonConfig";
import type { CompareMode, GeoCompareHandle, GeoCompareProps } from "../core/types";
import { CompareDivider } from "./CompareDivider";
import { CompareToolbar } from "./CompareToolbar";
import { ImageMetadata } from "./ImageMetadata";
import { Legend } from "./Legend";

const DEFAULT_VIEW = { center: [0, 0] as [number, number], zoom: 2, bearing: 0, pitch: 0 };

export const GeoCompare = forwardRef<GeoCompareHandle, GeoCompareProps>(function GeoCompare({
  before,
  after,
  mode = "swipe",
  initialPosition = 0.5,
  initialView = DEFAULT_VIEW,
  legendMode = "independent",
  className = "",
  style,
  onModeChange,
  onError,
}: GeoCompareProps, ref) {
  validateImage(before, "before");
  validateImage(after, "after");
  validatePosition(initialPosition);

  const [activeMode, setActiveMode] = useState<CompareMode>(mode);
  const [position, setPosition] = useState(initialPosition);
  const { root, beforeContainer, afterContainer, loading, error, getView, retry } = useComparisonMaps({
    before,
    after,
    initialView,
    mode: activeMode,
    onError,
  });

  useEffect(() => setActiveMode(mode), [mode]);

  useImperativeHandle(ref, () => ({
    exportConfig: () => exportComparisonConfig({
      before,
      after,
      mode: activeMode,
      position,
      view: getView(),
      legendMode,
    }),
  }));

  const changeMode = (next: CompareMode) => {
    setActiveMode(next);
    onModeChange?.(next);
  };

  return (
    <div ref={root} className={`geocompare geocompare--${activeMode} ${className}`.trim()} style={style}>
      <div className="geocompare-map geocompare-map--before" ref={beforeContainer} />
      <div
        className="geocompare-map geocompare-map--after"
        ref={afterContainer}
        style={activeMode === "swipe" ? { clipPath: `inset(0 0 0 ${position * 100}%)` } : undefined}
      />
      <CompareToolbar mode={activeMode} onChange={changeMode} />
      <div className="geocompare-label geocompare-label--before"><ImageMetadata image={before} /></div>
      <div className="geocompare-label geocompare-label--after"><ImageMetadata image={after} /></div>
      {activeMode === "swipe" && <CompareDivider container={root} position={position} onChange={setPosition} />}
      <div className="geocompare-legends">
        {legendMode === "shared" ? (
          before.legend && <Legend legend={before.legend} />
        ) : (
          <>
            {before.legend && <Legend legend={before.legend} />}
            {after.legend && <Legend legend={after.legend} />}
          </>
        )}
      </div>
      {loading && <div className="geocompare-status" role="status">Loading maps…</div>}
      {error && (
        <div className="geocompare-status geocompare-status--error" role="alert">
          <span className="geocompare-status-message">Unable to load {error.side} imagery.</span>
          <button type="button" onClick={retry}>Retry loading</button>
          <details>
            <summary>Details</summary>
            <span>{error.message}</span>
          </details>
        </div>
      )}
    </div>
  );
});
