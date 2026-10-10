import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { createComparisonMaps } from "./createComparisonMaps";

type Handler = (event: { error?: unknown }) => void;

class FakeMap {
  handlers = new Map<string, Set<Handler>>();
  removed = false;
  jumps = 0;
  center = { lng: 8, lat: 47 };

  on(event: string, handler: Handler) {
    const handlers = this.handlers.get(event) ?? new Set<Handler>();
    handlers.add(handler);
    this.handlers.set(event, handlers);
  }
  off(event: string, handler: Handler) { this.handlers.get(event)?.delete(handler); }
  emit(event: string, payload: { error?: unknown } = {}) {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }
  getCenter() { return this.center; }
  getZoom() { return 11; }
  getBearing() { return 0; }
  getPitch() { return 0; }
  jumpTo() { this.jumps += 1; this.emit("move"); }
  resize() { /* no-op */ }
  remove() { this.removed = true; }
}

const image = (id: string) => ({ id, label: id, style: "https://example.com/style.json" });
const container = {} as HTMLElement;

describe("MapLibre comparison adapter", () => {
  it("synchronizes either side without a move event loop and cleans up", () => {
    const before = new FakeMap();
    const after = new FakeMap();
    const onReady = vi.fn();
    const onError = vi.fn();
    const queue = [before, after];
    const controller = createComparisonMaps({
      beforeContainer: container,
      afterContainer: container,
      before: image("before"),
      after: image("after"),
      initialView: { center: [8, 47], zoom: 11 },
      onReady,
      onError,
      createMap: () => queue.shift() as unknown as MapLibreMap,
    });

    before.emit("load");
    expect(onReady).not.toHaveBeenCalled();
    after.emit("load");
    after.emit("load");
    expect(onReady).toHaveBeenCalledOnce();

    before.emit("move");
    expect(after.jumps).toBe(1);
    expect(before.jumps).toBe(0);
    expect(controller.getView()).toEqual({ center: [8, 47], zoom: 11, bearing: 0, pitch: 0 });
    after.emit("move");
    expect(before.jumps).toBe(1);

    after.emit("error", { error: new Error("tile failed") });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ side: "after", message: "tile failed" }));

    controller.dispose();
    controller.dispose();
    expect(before.removed).toBe(true);
    expect(after.removed).toBe(true);
    before.emit("move");
    expect(after.jumps).toBe(1);
  });

  it("removes the first map if creating the second fails", () => {
    const before = new FakeMap();
    let calls = 0;
    expect(() => createComparisonMaps({
      beforeContainer: container,
      afterContainer: container,
      before: image("before"),
      after: image("after"),
      initialView: { center: [8, 47], zoom: 11 },
      onReady: vi.fn(),
      onError: vi.fn(),
      createMap: () => {
        calls += 1;
        if (calls === 2) throw new Error("WebGL unavailable");
        return before as unknown as MapLibreMap;
      },
    })).toThrow("WebGL unavailable");
    expect(before.removed).toBe(true);
  });
});
