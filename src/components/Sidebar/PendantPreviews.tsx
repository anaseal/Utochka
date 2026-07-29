import { PendantTemplate } from '../../types/pendant';

const ANCHOR_R = 18;

export const PendantPreview = ({ template }: { template: PendantTemplate }) => {
  let minX = -ANCHOR_R;
  let maxX = ANCHOR_R;
  let minY = -ANCHOR_R;
  let maxY = ANCHOR_R;

  for (const bead of template.beads) {
    const hx = bead.shape === 'circle' ? (bead.r ?? 0) : (bead.w ?? 0) / 2;
    const hy = bead.shape === 'circle' ? (bead.r ?? 0) : (bead.h ?? 0) / 2;
    minX = Math.min(minX, bead.dx - hx);
    maxX = Math.max(maxX, bead.dx + hx);
    minY = Math.min(minY, bead.dy - hy);
    maxY = Math.max(maxY, bead.dy + hy);
  }

  const pad = 8;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className="pendant-preview"
      preserveAspectRatio="xMidYMid meet"
    >
      <circle className="pendant-preview__anchor" cx={0} cy={0} r={ANCHOR_R} />
      {template.beads.map((bead, index) => {
        const beadTypeClass = bead.type === 'NODE' ? 'bead--type-node' : 'bead--type-span';
        return (
          <g key={index} className={`bead ${beadTypeClass} bead--empty`}>
            {bead.shape === 'circle' ? (
              <circle
                className="bead__body"
                cx={bead.dx}
                cy={bead.dy}
                r={bead.r ?? 0}
              />
            ) : (
              <rect
                className="bead__body"
                x={bead.dx - (bead.w ?? 0) / 2}
                y={bead.dy - (bead.h ?? 0) / 2}
                width={bead.w ?? 0}
                height={bead.h ?? 0}
                rx={4}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

const BAND_YS = [-24, -12, 0, 12, 24] as const;

export const BandPreview = () => (
  <svg
    viewBox="-12 -32 24 64"
    className="pendant-preview"
    preserveAspectRatio="xMidYMid meet"
  >
    {BAND_YS.map((y) => (
      <g key={y} className="bead bead--type-span bead--empty">
        <circle className="bead__body" cx={0} cy={y} r={6} />
      </g>
    ))}
  </svg>
);

// В отличие от Band (полоса без якоря — свободно висит между рядами), хвост
// всегда крепится к одной ноде — якорный кружок сверху, как у PendantPreview,
// показывает это отличие на глаз.
const TAIL_YS = [14, 24, 34, 44] as const;

export const TailPreview = () => (
  <svg
    viewBox="-26 -26 52 76"
    className="pendant-preview"
    preserveAspectRatio="xMidYMid meet"
  >
    <circle className="pendant-preview__anchor" cx={0} cy={0} r={ANCHOR_R} />
    {TAIL_YS.map((y) => (
      <g key={y} className="bead bead--type-span bead--empty">
        <circle className="bead__body" cx={0} cy={y} r={6} />
      </g>
    ))}
  </svg>
);
