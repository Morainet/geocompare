# GeoCompare

A React and TypeScript component for comparing two georeferenced map styles. This repository is an early project scaffold; the public API and npm package name are not yet final.

## Start the demo

Requires Node.js 20.19+ and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open the local address printed by Vite. The demo compares two dated NASA MODIS/Terra true-color daily composites over the Aral Sea. An internet connection is required for the imagery tiles. See [demo data and limitations](./docs/DEMO_DATA.md).

## Use the component

```tsx
import "maplibre-gl/dist/maplibre-gl.css";
import "@morainet/geocompare/style.css";
import { GeoCompare } from "@morainet/geocompare";

<GeoCompare
  before={{ id: "before", label: "Before", style: "/before-style.json" }}
  after={{ id: "after", label: "After", style: "/after-style.json" }}
  initialView={{ center: [8.54, 47.38], zoom: 11 }}
  style={{ height: 600 }}
/>;
```

`style` must be a MapLibre style URL or style specification. This package does not decode GeoTIFF/COG files directly. See [the PRD](./docs/PRD.md) for planned scope.

If a map or imagery request fails, GeoCompare shows the affected side and a retry button. Retrying reloads both maps while retaining the current view, mode and divider position.

The Swipe divider is keyboard-accessible: Left/Right adjusts by 1%, Page Down/Up by 10%, and Home/End moves to either edge. Its accessible value describes how much of each image is visible.

The source layers and extension points are described in [the architecture note](./docs/ARCHITECTURE.md).

MapLibre 6 requires a worker URL in Vite projects. Configure it before mounting the component:

```ts
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);
```

## Save and restore a comparison

`GeoCompare` exposes the current view, mode and slider position through a ref. The exported JSON contains metadata and layout only; it never includes either MapLibre style. The application supplies styles again when importing by image ID.

```tsx
import { useRef } from "react";
import {
  GeoCompare,
  importComparisonConfig,
  type GeoCompareHandle,
} from "@morainet/geocompare";

// Inside a React component:
const compare = useRef<GeoCompareHandle>(null);
// Render <GeoCompare ref={compare} ... />.

// Inside an event handler:
const json = compare.current?.exportConfig();
if (json) {
  const restored = importComparisonConfig(json, (id) => styleCatalog[id]);
  // Mount <GeoCompare {...restored} /> to restore the saved layout.
}
```

The resolver should return a style for every referenced ID. Treat labels, source text, bands and legend text as public display metadata; do not put credentials in those fields.

## Development

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm build:demo
pnpm test:package
```

`pnpm test:e2e` starts the Vite demo server and runs Playwright against an installed Google Chrome in headless mode. Map tiles are replaced with a local test fixture, so the suite does not depend on NASA GIBS availability. After `pnpm build`, `pnpm test:package` packs the library, then typechecks and builds a small Vite consumer against the packed files. Run `pnpm check:all` for lint, types, unit tests, package/consumer builds and browser tests together. `pnpm check` keeps the browser suite separate for faster iteration.

The package remains private until its API, package name, compatibility and data licensing have been reviewed. Build output is in `dist/`.
