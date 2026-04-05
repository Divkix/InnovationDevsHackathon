/**
 * Layout result for object-fit cover calculations
 */
export interface ObjectCoverLayout {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Canvas coordinate system
 */
export interface CanvasCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Bounding box interface (matching the type in types/index.ts)
 */
export interface BoundingBox {
  originX?: number;
  originY?: number;
  width?: number;
  height?: number;
}

/**
 * Calculate object-fit cover layout
 */
export function getObjectCoverLayout(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
): ObjectCoverLayout {
  if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;

  return {
    scale,
    offsetX: (containerWidth - renderedWidth) / 2,
    offsetY: (containerHeight - renderedHeight) / 2,
  };
}

/**
 * Project bounding box coordinates to canvas space
 */
export function projectBoundingBoxToCanvas(
  box: BoundingBox,
  layout: ObjectCoverLayout,
): CanvasCoordinates {
  return {
    x: (box.originX || 0) * layout.scale + layout.offsetX,
    y: (box.originY || 0) * layout.scale + layout.offsetY,
    width: (box.width || 0) * layout.scale,
    height: (box.height || 0) * layout.scale,
  };
}
