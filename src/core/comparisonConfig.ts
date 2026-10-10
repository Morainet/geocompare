import type { StyleSpecification } from "maplibre-gl";
import { validateImage, validateLegend, validatePosition } from "./config";
import type {
  CompareImage,
  CompareMode,
  CompareView,
  LegendConfig,
  RestoredComparison,
} from "./types";

type SnapshotImage = Omit<CompareImage, "style">;

interface ComparisonSnapshot {
  version: 1;
  before: SnapshotImage;
  after: SnapshotImage;
  mode: CompareMode;
  position: number;
  view: CompareView;
  legendMode: "independent" | "shared";
}

interface ExportOptions extends Omit<ComparisonSnapshot, "version" | "before" | "after"> {
  before: CompareImage;
  after: CompareImage;
}

export type StyleResolver = (id: string, side: "before" | "after") => string | StyleSpecification;

function snapshotImage(image: CompareImage): SnapshotImage {
  return {
    id: image.id,
    label: image.label,
    ...(image.acquiredAt === undefined ? {} : { acquiredAt: image.acquiredAt }),
    ...(image.source === undefined ? {} : { source: image.source }),
    ...(image.bands === undefined ? {} : { bands: [...image.bands] }),
    ...(image.legend === undefined ? {} : {
      legend: {
        ...(image.legend.title === undefined ? {} : { title: image.legend.title }),
        ...(image.legend.unit === undefined ? {} : { unit: image.legend.unit }),
        ...(image.legend.min === undefined ? {} : { min: image.legend.min }),
        ...(image.legend.max === undefined ? {} : { max: image.legend.max }),
        stops: image.legend.stops.map(({ value, color, label }) => ({ value, color, ...(label === undefined ? {} : { label }) })),
      },
    }),
  };
}

/** Exports display state only. Map styles and credentials are deliberately excluded. */
export function exportComparisonConfig(options: ExportOptions): string {
  validateImage(options.before, "before");
  validateImage(options.after, "after");
  validatePosition(options.position);
  validateView(options.view);
  const snapshot: ComparisonSnapshot = {
    version: 1,
    before: snapshotImage(options.before),
    after: snapshotImage(options.after),
    mode: options.mode,
    position: options.position,
    view: {
      center: [...options.view.center] as [number, number],
      zoom: options.view.zoom,
      bearing: options.view.bearing,
      pitch: options.view.pitch,
    },
    legendMode: options.legendMode,
  };
  return JSON.stringify(snapshot);
}

function object(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, allowed: string[], context: string): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra) throw new Error(`${context}: unsupported field ${extra}`);
}

function string(value: unknown, context: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${context} must be a nonempty string`);
  return value;
}

function optionalString(value: unknown, context: string): string | undefined {
  return value === undefined ? undefined : string(value, context);
}

function number(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${context} must be a finite number`);
  return value;
}

function validateView(view: CompareView): void {
  if (view.center.length !== 2) throw new Error("view.center must contain longitude and latitude");
  number(view.center[0], "view.center[0]");
  number(view.center[1], "view.center[1]");
  number(view.zoom, "view.zoom");
  if (view.bearing !== undefined) number(view.bearing, "view.bearing");
  if (view.pitch !== undefined) number(view.pitch, "view.pitch");
}

function parseView(raw: unknown): CompareView {
  const value = object(raw, "view");
  onlyKeys(value, ["center", "zoom", "bearing", "pitch"], "view");
  if (!Array.isArray(value.center) || value.center.length !== 2) {
    throw new Error("view.center must contain longitude and latitude");
  }
  const view: CompareView = {
    center: [number(value.center[0], "view.center[0]"), number(value.center[1], "view.center[1]")],
    zoom: number(value.zoom, "view.zoom"),
  };
  if (value.bearing !== undefined) view.bearing = number(value.bearing, "view.bearing");
  if (value.pitch !== undefined) view.pitch = number(value.pitch, "view.pitch");
  return view;
}

function parseLegend(raw: unknown, side: string): LegendConfig {
  const value = object(raw, `${side}.legend`);
  onlyKeys(value, ["title", "unit", "min", "max", "stops"], `${side}.legend`);
  if (!Array.isArray(value.stops)) throw new Error(`${side}.legend.stops must be an array`);
  const legend: LegendConfig = {
    stops: value.stops.map((item, index) => {
      const stop = object(item, `${side}.legend.stops[${index}]`);
      onlyKeys(stop, ["value", "color", "label"], `${side}.legend.stops[${index}]`);
      return {
        value: number(stop.value, `${side}.legend.stops[${index}].value`),
        color: string(stop.color, `${side}.legend.stops[${index}].color`),
        ...(stop.label === undefined ? {} : { label: string(stop.label, `${side}.legend.stops[${index}].label`) }),
      };
    }),
  };
  if (value.title !== undefined) legend.title = string(value.title, `${side}.legend.title`);
  if (value.unit !== undefined) legend.unit = string(value.unit, `${side}.legend.unit`);
  if (value.min !== undefined) legend.min = number(value.min, `${side}.legend.min`);
  if (value.max !== undefined) legend.max = number(value.max, `${side}.legend.max`);
  validateLegend(legend, side);
  return legend;
}

function parseImage(raw: unknown, side: "before" | "after", resolveStyle: StyleResolver): CompareImage {
  const value = object(raw, side);
  onlyKeys(value, ["id", "label", "acquiredAt", "source", "bands", "legend"], side);
  const id = string(value.id, `${side}.id`);
  const image: CompareImage = {
    id,
    label: string(value.label, `${side}.label`),
    style: resolveStyle(id, side),
  };
  const acquiredAt = optionalString(value.acquiredAt, `${side}.acquiredAt`);
  const source = optionalString(value.source, `${side}.source`);
  if (acquiredAt !== undefined) image.acquiredAt = acquiredAt;
  if (source !== undefined) image.source = source;
  if (value.bands !== undefined) {
    if (!Array.isArray(value.bands)) throw new Error(`${side}.bands must be an array`);
    image.bands = value.bands.map((item, index) => string(item, `${side}.bands[${index}]`));
  }
  if (value.legend !== undefined) image.legend = parseLegend(value.legend, side);
  validateImage(image, side);
  return image;
}

/** Restores a snapshot with styles supplied by the host application. */
export function importComparisonConfig(json: string, resolveStyle: StyleResolver): RestoredComparison {
  const raw: unknown = JSON.parse(json);
  const value = object(raw, "comparison config");
  onlyKeys(value, ["version", "before", "after", "mode", "position", "view", "legendMode"], "comparison config");
  if (value.version !== 1) throw new Error("Unsupported comparison config version");
  if (value.mode !== "swipe" && value.mode !== "side-by-side") throw new Error("Invalid comparison mode");
  if (value.legendMode !== "independent" && value.legendMode !== "shared") throw new Error("Invalid legend mode");
  const position = number(value.position, "position");
  validatePosition(position);
  return {
    before: parseImage(value.before, "before", resolveStyle),
    after: parseImage(value.after, "after", resolveStyle),
    mode: value.mode,
    initialPosition: position,
    initialView: parseView(value.view),
    legendMode: value.legendMode,
  };
}
