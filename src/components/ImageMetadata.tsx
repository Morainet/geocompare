import type { CompareImage } from "../core/types";

export function ImageMetadata({ image }: { image: CompareImage }) {
  return (
    <div className="geocompare-metadata">
      <strong>{image.label}</strong>
      {image.acquiredAt && <span>{image.acquiredAt}</span>}
      {image.source && <span>{image.source}</span>}
      {image.bands?.length ? <span>{image.bands.join(", ")}</span> : null}
    </div>
  );
}
