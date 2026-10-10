import { createRoot } from "react-dom/client";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import "@morainet/geocompare/style.css";
import { GeoCompare, type CompareImage } from "@morainet/geocompare";

setWorkerUrl(workerUrl);

const image: CompareImage = {
  id: "smoke-test",
  label: "Package consumer",
  style: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#dce5e8" } }] },
};

createRoot(document.getElementById("root")!).render(
  <GeoCompare before={image} after={image} initialView={{ center: [0, 0], zoom: 2 }} style={{ height: 400 }} />,
);
