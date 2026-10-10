import type { StyleSpecification } from "maplibre-gl";
import type { CompareImage, RestoredComparison } from "../../src/index";

const layer = "MODIS_Terra_CorrectedReflectance_TrueColor";
const attribution = "NASA GIBS / EOSDIS";

function imageryStyle(date: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      imagery: {
        type: "raster",
        tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`],
        tileSize: 256,
        maxzoom: 9,
        attribution,
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#e8ecea" } },
      { id: "imagery", type: "raster", source: "imagery" },
    ],
  };
}

function comparisonImage(date: string): CompareImage {
  return {
    id: `modis-terra-${date}`,
    label: date === "2005-07-15" ? "July 2005" : "July 2023",
    acquiredAt: date,
    source: "NASA GIBS · MODIS/Terra daily composite",
    bands: ["True color (bands 1, 4, 3)"],
    style: imageryStyle(date),
  };
}

export const before = comparisonImage("2005-07-15");
export const after = comparisonImage("2023-07-15");
export const catalog: Record<string, CompareImage> = { [before.id]: before, [after.id]: after };

export const initialConfig: RestoredComparison = {
  before,
  after,
  initialView: { center: [59.3, 44.7], zoom: 6 },
};
