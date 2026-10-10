import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  GeoCompare,
  importComparisonConfig,
  type GeoCompareHandle,
  type RestoredComparison,
} from "../../src/index";
import { catalog, initialConfig } from "./imagery";
import "./page.css";

setWorkerUrl(workerUrl);

function App() {
  const compare = useRef<GeoCompareHandle>(null);
  const [config, setConfig] = useState<RestoredComparison>(initialConfig);
  const [revision, setRevision] = useState(0);
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");

  const restore = () => {
    try {
      const restored = importComparisonConfig(json, (id) => {
        const style = catalog[id]?.style;
        if (!style) throw new Error(`No local style registered for ${id}`);
        return style;
      });
      setConfig(restored);
      setRevision((value) => value + 1);
      setMessage("Comparison restored from JSON.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not restore comparison.");
    }
  };

  return (
    <div className="demo-page">
      <header className="demo-site-header">
        <div className="demo-brand"><span className="demo-brand-symbol" aria-hidden="true">G</span><span>GeoCompare</span></div>
        <span className="demo-header-tag">Interactive imagery study <span aria-hidden="true">↗</span></span>
      </header>
      <main>
        <section className="demo-intro" aria-labelledby="demo-title">
          <div className="demo-intro-copy">
            <p className="demo-kicker"><span className="demo-kicker-line" /> A satellite perspective · 01</p>
            <h1 id="demo-title">The Aral Sea,<br /><em>across time.</em></h1>
            <p className="demo-deck">Explore two dated views of the same landscape. Drag the divider to reveal each image, or switch to a side-by-side comparison.</p>
          </div>
          <div className="demo-periods" aria-label="Comparison dates">
            <div><span>EARLIER VIEW</span><strong>15 Jul 2005</strong></div>
            <span className="demo-period-arrow" aria-hidden="true">→</span>
            <div><span>LATER VIEW</span><strong>15 Jul 2023</strong></div>
          </div>
        </section>

        <section className="demo-workspace" aria-label="Imagery comparison">
          <div className="demo-workspace-bar"><span><i aria-hidden="true" /> Live comparison</span><span>Drag to explore · Scroll to zoom</span></div>
          <div className="demo-map">
            <GeoCompare key={revision} ref={compare} {...config} />
          </div>
          <div className="demo-workspace-footer">
            <span>MODIS / TERRA <span aria-hidden="true">·</span> TRUE COLOR</span>
            <span>Imagery via <a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer">NASA GIBS / Worldview ↗</a></span>
          </div>
        </section>

        <div className="demo-details-grid">
          <section className="demo-note" aria-labelledby="demo-note-title">
            <span className="demo-section-index">01 / ABOUT THE DATA</span>
            <h2 id="demo-note-title">A view, not a measurement.</h2>
            <p>These daily composites may include clouds or different acquisition conditions. Visual differences alone do not quantify change.</p>
            <div className="demo-facts"><div><strong>250 m</strong><span>Highest native resolution at the equator</span></div><div><strong>2 dates</strong><span>Same month, eighteen years apart</span></div></div>
          </section>
          <section className="demo-config" aria-labelledby="demo-config-title">
            <span className="demo-section-index">02 / DEVELOPER TOOLS</span>
            <h2 id="demo-config-title">Comparison config</h2>
            <p>Export the current view or restore a saved layout. Styles stay in this app’s local catalog.</p>
            <div className="demo-actions">
              <button type="button" onClick={() => {
                setJson(compare.current?.exportConfig() ?? "");
                setMessage("Current comparison exported.");
              }}>Export JSON <span aria-hidden="true">↗</span></button>
              <button type="button" onClick={restore} disabled={!json.trim()}>Restore JSON</button>
            </div>
            <textarea aria-label="Comparison JSON" placeholder="Export a comparison to view its JSON here…" value={json} onChange={(event) => setJson(event.target.value)} spellCheck={false} />
            {message && <p className="demo-feedback" role="status">{message}</p>}
          </section>
        </div>
      </main>
      <footer className="demo-site-footer">
        <span>GeoCompare <span aria-hidden="true">·</span> Open-source imagery comparison</span>
        <span>We acknowledge the use of imagery provided by services from NASA’s Global Imagery Browse Services (GIBS), part of NASA’s Earth Science Data and Information System (ESDIS).</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
