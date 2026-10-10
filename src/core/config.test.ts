import { describe, expect, it } from "vitest";
import { validateImage, validatePosition } from "./config";

describe("configuration", () => {
  it("rejects invalid slider positions", () => {
    expect(() => validatePosition(-0.1)).toThrow();
    expect(() => validatePosition(1.1)).toThrow();
    expect(() => validatePosition(0.5)).not.toThrow();
  });

  it("rejects duplicate legend values", () => {
    expect(() => validateImage({
      id: "a",
      label: "A",
      style: "https://example.com/style.json",
      legend: { stops: [{ value: 1, color: "red" }, { value: 1, color: "blue" }] },
    }, "before")).toThrow("unique");
  });
});
