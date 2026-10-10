# Code structure

GeoCompare has three small layers:

```text
src/
├── core/
│   ├── types.ts                 Public data contracts
│   ├── config.ts                Input validation
│   └── comparisonConfig.ts      Versioned display snapshot
├── adapters/maplibre/
│   ├── createComparisonMaps.ts  Map creation, camera sync, cleanup
│   └── useComparisonMaps.ts     React lifecycle and status bridge
├── components/
│   ├── GeoCompare.tsx           Composition and mode state
│   ├── CompareToolbar.tsx
│   ├── CompareDivider.tsx
│   ├── ImageMetadata.tsx
│   └── Legend.tsx
├── style.css
└── index.ts                    Public exports
```

`core` defines the data accepted by the component. It has no React rendering or map creation code. The MapLibre adapter owns exactly two map instances and their event listeners. The React hook creates and disposes the adapter as styles or initial camera values change. `components` renders the comparison controls and metadata.

The package exports only `GeoCompare`, types, and validation helpers through `src/index.ts`. Internal adapter APIs can change without becoming a public compatibility promise.

## Next implementation steps

1. Decide whether a COG or STAC adapter is needed from integration feedback.

The demo now uses two dated NASA GIBS MODIS/Terra raster styles, defined in `examples/demo/imagery.ts`. The data source, attribution and interpretation limits are documented in `docs/DEMO_DATA.md`.

Map load errors are shown with a retry action. Retrying recreates both MapLibre instances from the current camera, preserving the comparison mode and divider position.

Browser regressions live in `e2e/`. Playwright starts the demo server, uses installed Chrome, and intercepts map tiles with a generated PNG. The tests cover Swipe dragging, mode and config restoration, responsive layout, repeated mounts and camera synchronization.

`scripts/verify-package.mjs` packs the built library and checks its exported files, then typechecks and builds `tests/package-consumer/` against the packed package. This catches missing files or broken ESM, CSS and declaration entry points without publishing the package.
