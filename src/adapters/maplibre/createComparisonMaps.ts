import { Map as MapLibreMap, type MapOptions } from "maplibre-gl";
import type { CompareImage, CompareView, GeoCompareError } from "../../core/types";

type MapInstance = Pick<
  MapLibreMap,
  "on" | "off" | "remove" | "resize" | "getCenter" | "getZoom" | "getBearing" | "getPitch" | "jumpTo"
>;

export interface ComparisonMaps {
  before: MapInstance;
  after: MapInstance;
  getView(): CompareView;
  resize(): void;
  dispose(): void;
}

interface CreateComparisonMapsOptions {
  beforeContainer: HTMLElement;
  afterContainer: HTMLElement;
  before: CompareImage;
  after: CompareImage;
  initialView: CompareView;
  onReady(): void;
  onError(error: GeoCompareError): void;
  createMap?: (options: MapOptions) => MapInstance;
}

export class MapInitializationError extends Error {
  constructor(public readonly side: "before" | "after", cause: unknown) {
    super(cause instanceof Error ? cause.message : "Map could not be initialized", { cause });
    this.name = "MapInitializationError";
  }
}

export function createComparisonMaps({
  beforeContainer,
  afterContainer,
  before,
  after,
  initialView,
  onReady,
  onError,
  createMap = (options) => new MapLibreMap(options),
}: CreateComparisonMapsOptions): ComparisonMaps {
  const camera = {
    center: initialView.center,
    zoom: initialView.zoom,
    bearing: initialView.bearing ?? 0,
    pitch: initialView.pitch ?? 0,
  };
  let beforeMap: MapInstance;
  try {
    beforeMap = createMap({ container: beforeContainer, style: before.style, ...camera });
  } catch (error) {
    throw new MapInitializationError("before", error);
  }
  let afterMap: MapInstance;
  try {
    afterMap = createMap({ container: afterContainer, style: after.style, ...camera });
  } catch (error) {
    beforeMap.remove();
    throw new MapInitializationError("after", error);
  }

  let disposed = false;
  let syncing = false;
  const loaded = new Set<"before" | "after">();

  const sync = (source: MapInstance, target: MapInstance) => {
    if (disposed || syncing) return;
    syncing = true;
    try {
      target.jumpTo({
        center: source.getCenter(),
        zoom: source.getZoom(),
        bearing: source.getBearing(),
        pitch: source.getPitch(),
      });
    } finally {
      syncing = false;
    }
  };

  const syncBefore = () => sync(beforeMap, afterMap);
  const syncAfter = () => sync(afterMap, beforeMap);
  const markLoaded = (side: "before" | "after") => {
    if (disposed || loaded.has(side)) return;
    loaded.add(side);
    if (loaded.size === 2) onReady();
  };
  const loadedBefore = () => markLoaded("before");
  const loadedAfter = () => markLoaded("after");
  const report = (side: "before" | "after", event: { error?: unknown }) => {
    if (disposed) return;
    onError({
      side,
      message: event.error instanceof Error ? event.error.message : "Map could not be loaded",
      cause: event.error,
    });
  };
  const errorBefore = (event: { error?: unknown }) => report("before", event);
  const errorAfter = (event: { error?: unknown }) => report("after", event);

  beforeMap.on("move", syncBefore);
  afterMap.on("move", syncAfter);
  beforeMap.on("load", loadedBefore);
  afterMap.on("load", loadedAfter);
  beforeMap.on("error", errorBefore);
  afterMap.on("error", errorAfter);

  return {
    before: beforeMap,
    after: afterMap,
    getView() {
      const center = beforeMap.getCenter();
      return {
        center: [center.lng, center.lat],
        zoom: beforeMap.getZoom(),
        bearing: beforeMap.getBearing(),
        pitch: beforeMap.getPitch(),
      };
    },
    resize() {
      if (disposed) return;
      beforeMap.resize();
      afterMap.resize();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      beforeMap.off("move", syncBefore);
      afterMap.off("move", syncAfter);
      beforeMap.off("load", loadedBefore);
      afterMap.off("load", loadedAfter);
      beforeMap.off("error", errorBefore);
      afterMap.off("error", errorAfter);
      beforeMap.remove();
      afterMap.remove();
    },
  };
}
