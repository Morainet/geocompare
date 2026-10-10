import { describe, expect, it, vi } from "vitest";
import { exportComparisonConfig, importComparisonConfig } from "./comparisonConfig";
import type { CompareImage } from "./types";

const before: CompareImage = {
  id: "before",
  label: "2025 image",
  acquiredAt: "2025-06-01",
  source: "Public imagery",
  bands: ["red", "green", "blue"],
  style: "https://tiles.example.com/style.json?access_token=do-not-export",
  legend: {
    title: "NDVI",
    unit: "index",
    min: -1,
    max: 1,
    stops: [{ value: -1, color: "#663399" }, { value: 1, color: "#00aa55" }],
  },
};
const after: CompareImage = {
  id: "after",
  label: "2026 image",
  style: "https://tiles.example.com/after.json?key=also-secret",
};

describe("comparison config", () => {
  it("round-trips display state while excluding styles and unexpected fields", () => {
    const json = exportComparisonConfig({
      before: { ...before, legend: { ...before.legend!, secret: "hidden" } } as CompareImage,
      after,
      mode: "side-by-side",
      position: 0.37,
      view: { center: [8.54, 47.38], zoom: 11, bearing: 15, pitch: 20 },
      legendMode: "independent",
    });
    expect(json).not.toContain("do-not-export");
    expect(json).not.toContain("also-secret");
    expect(json).not.toContain("hidden");

    const resolveStyle = vi.fn((id: string) => `https://public.example.com/${id}.json`);
    const restored = importComparisonConfig(json, resolveStyle);
    expect(restored).toMatchObject({
      mode: "side-by-side",
      initialPosition: 0.37,
      initialView: { center: [8.54, 47.38], zoom: 11, bearing: 15, pitch: 20 },
      before: { id: "before", label: "2025 image", acquiredAt: "2025-06-01", style: "https://public.example.com/before.json" },
      after: { id: "after", style: "https://public.example.com/after.json" },
    });
    expect(resolveStyle).toHaveBeenCalledTimes(2);
  });

  it("rejects embedded styles and unsupported versions", () => {
    const json = exportComparisonConfig({
      before,
      after,
      mode: "swipe",
      position: 0.5,
      view: { center: [0, 0], zoom: 2 },
      legendMode: "shared",
    });
    const resolveStyle = vi.fn(() => "https://public.example.com/style.json");
    const withStyle = JSON.parse(json);
    withStyle.before.style = "https://secret.example.com";
    expect(() => importComparisonConfig(JSON.stringify(withStyle), resolveStyle)).toThrow("unsupported field style");
    expect(resolveStyle).not.toHaveBeenCalled();

    const future = JSON.parse(json);
    future.version = 2;
    expect(() => importComparisonConfig(JSON.stringify(future), resolveStyle)).toThrow("Unsupported comparison config version");
  });
});
