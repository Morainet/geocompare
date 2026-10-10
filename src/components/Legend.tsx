import type { LegendConfig } from "../core/types";

export function Legend({ legend }: { legend: LegendConfig }) {
  const stops = [...legend.stops].sort((a, b) => a.value - b.value);
  return (
    <div className="geocompare-legend">
      {legend.title && <strong>{legend.title}</strong>}
      <div className="geocompare-legend-stops">
        {stops.map((stop) => (
          <span key={stop.value}>
            <i style={{ backgroundColor: stop.color }} />
            {stop.label ?? `${stop.value}${legend.unit ? ` ${legend.unit}` : ""}`}
          </span>
        ))}
      </div>
    </div>
  );
}
