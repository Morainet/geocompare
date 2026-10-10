import type { CompareImage, LegendConfig } from "./types";

export function validateImage(image: CompareImage, side: string): void {
  if (!image?.id?.trim() || !image.label?.trim() || !image.style) {
    throw new Error(`${side}: id, label and style are required`);
  }
  if (image.legend) validateLegend(image.legend, side);
}

export function validateLegend(legend: LegendConfig, side: string): void {
  if (!legend.stops.length) throw new Error(`${side}: legend needs at least one stop`);
  if (legend.min !== undefined && legend.max !== undefined && legend.min >= legend.max) {
    throw new Error(`${side}: legend min must be less than max`);
  }
  const values = legend.stops.map((stop) => stop.value);
  if (values.some((value) => !Number.isFinite(value)) || new Set(values).size !== values.length) {
    throw new Error(`${side}: legend stop values must be finite and unique`);
  }
}

export function validatePosition(position: number): void {
  if (!Number.isFinite(position) || position < 0 || position > 1) {
    throw new Error("initialPosition must be between 0 and 1");
  }
}
