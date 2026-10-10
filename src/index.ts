import "./style.css";

export { GeoCompare } from "./components/GeoCompare";
export { validateImage, validateLegend, validatePosition } from "./core/config";
export { exportComparisonConfig, importComparisonConfig } from "./core/comparisonConfig";
export type {
  CompareImage,
  CompareMode,
  CompareView,
  GeoCompareError,
  GeoCompareHandle,
  GeoCompareProps,
  LegendConfig,
  LegendStop,
  RestoredComparison,
} from "./core/types";
export type { StyleResolver } from "./core/comparisonConfig";
