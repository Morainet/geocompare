import { useEffect, useRef, useState } from "react";
import type { CompareImage, CompareMode, CompareView, GeoCompareError } from "../../core/types";
import { createComparisonMaps, MapInitializationError, type ComparisonMaps } from "./createComparisonMaps";

interface UseComparisonMapsOptions {
  before: CompareImage;
  after: CompareImage;
  initialView: CompareView;
  mode: CompareMode;
  onError?: (error: GeoCompareError) => void;
}

export function useComparisonMaps({ before, after, initialView, mode, onError }: UseComparisonMapsOptions) {
  const root = useRef<HTMLDivElement>(null);
  const beforeContainer = useRef<HTMLDivElement>(null);
  const afterContainer = useRef<HTMLDivElement>(null);
  const maps = useRef<ComparisonMaps | null>(null);
  const retryView = useRef<CompareView | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GeoCompareError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { center, zoom, bearing, pitch } = initialView;
  const longitude = center[0];
  const latitude = center[1];

  useEffect(() => {
    if (!beforeContainer.current || !afterContainer.current) return;
    setLoading(true);
    setError(null);
    const camera = retryView.current ?? { center: [longitude, latitude] as [number, number], zoom, bearing, pitch };
    retryView.current = null;

    let controller: ComparisonMaps;
    try {
      controller = createComparisonMaps({
        beforeContainer: beforeContainer.current,
        afterContainer: afterContainer.current,
        before,
        after,
        initialView: camera,
        onReady: () => setLoading(false),
        onError: (details) => {
          setError(details);
          setLoading(false);
          onErrorRef.current?.(details);
        },
      });
    } catch (cause) {
      const details: GeoCompareError = {
        side: cause instanceof MapInitializationError ? cause.side : "before",
        message: cause instanceof Error ? cause.message : "Map could not be initialized",
        cause,
      };
      setError(details);
      setLoading(false);
      onErrorRef.current?.(details);
      return;
    }
    maps.current = controller;
    const frame = requestAnimationFrame(() => controller.resize());
    return () => {
      cancelAnimationFrame(frame);
      controller.dispose();
      if (maps.current === controller) maps.current = null;
    };
    // Map instances change only when their styles or camera values change.
  }, [before.style, after.style, longitude, latitude, zoom, bearing, pitch, retryCount]);

  useEffect(() => {
    if (!root.current) return;
    const resize = () => maps.current?.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root.current);
    const frame = requestAnimationFrame(resize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [mode]);

  const getView = () => maps.current?.getView() ?? initialView;
  const retry = () => {
    retryView.current = getView();
    setRetryCount((count) => count + 1);
  };
  return { root, beforeContainer, afterContainer, loading, error, getView, retry };
}
