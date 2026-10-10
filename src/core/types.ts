import type { CSSProperties } from "react";
import type { StyleSpecification } from "maplibre-gl";

export type CompareMode = "swipe" | "side-by-side";

export interface LegendStop {
  value: number;
  color: string;
  label?: string;
}

export interface LegendConfig {
  title?: string;
  unit?: string;
  min?: number;
  max?: number;
  stops: LegendStop[];
}

export interface CompareImage {
  id: string;
  label: string;
  acquiredAt?: string;
  source?: string;
  bands?: string[];
  style: string | StyleSpecification;
  legend?: LegendConfig;
}

export interface CompareView {
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface GeoCompareError {
  side: "before" | "after";
  message: string;
  cause?: unknown;
}

export interface GeoCompareHandle {
  /** Returns a versioned JSON snapshot without map styles or runtime credentials. */
  exportConfig(): string;
}

export type RestoredComparison = Pick<
  GeoCompareProps,
  "before" | "after" | "mode" | "initialPosition" | "initialView" | "legendMode"
>;

export interface GeoCompareProps {
  before: CompareImage;
  after: CompareImage;
  mode?: CompareMode;
  initialPosition?: number;
  initialView?: CompareView;
  legendMode?: "independent" | "shared";
  className?: string;
  style?: CSSProperties;
  onModeChange?: (mode: CompareMode) => void;
  onError?: (error: GeoCompareError) => void;
}
