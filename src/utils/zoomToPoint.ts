export interface ZoomToPointParams {
  containerLeft: number;
  containerTop: number;
  svgLeft: number;
  svgTop: number;
  paddingLeft: number;
  paddingTop: number;
  clientX: number;
  clientY: number;
  oldZoom: number;
  newZoom: number;
}

export interface ZoomToPointScroll {
  scrollLeft: number;
  scrollTop: number;
}

// zoom здесь — прямое умножение width/height SVG-атрибутов при неизменном viewBox
// (не CSS-transform), поэтому пересчёт идёт через scroll-позицию контейнера.
export const computeZoomToPointScroll = ({
  containerLeft,
  containerTop,
  svgLeft,
  svgTop,
  paddingLeft,
  paddingTop,
  clientX,
  clientY,
  oldZoom,
  newZoom,
}: ZoomToPointParams): ZoomToPointScroll => {
  const viewBoxUnitX = (clientX - svgLeft) / oldZoom;
  const viewBoxUnitY = (clientY - svgTop) / oldZoom;

  return {
    scrollLeft: containerLeft + paddingLeft - clientX + viewBoxUnitX * newZoom,
    scrollTop: containerTop + paddingTop - clientY + viewBoxUnitY * newZoom,
  };
};
