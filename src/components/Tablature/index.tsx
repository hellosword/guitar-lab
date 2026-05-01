/**
 * 六线谱 SVG 组件
 * 用于展示单个六线谱位置
 */
import type { FretPosition } from '../../types/theory';

interface TablatureProps {
  position: FretPosition;
}

const STRINGS = [1, 2, 3, 4, 5, 6] as const;

export default function Tablature({ position }: TablatureProps) {
  const width = 520;
  const height = 190;
  const left = 42;
  const right = 28;
  const top = 28;
  const stringSpacing = 24;
  const noteX = left + (width - left - right) / 2;
  const noteY = top + (position.string - 1) * stringSpacing;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="单音六线谱">
      <rect x="0" y="0" width={width} height={height} rx="8" fill="#171420" />
      {STRINGS.map((string) => {
        const y = top + (string - 1) * stringSpacing;

        return (
          <g key={`tab-string-${string}`}>
            <text x={14} y={y + 5} fill="#94a3b8" fontSize="13">
              {string}
            </text>
            <line x1={left} y1={y} x2={width - right} y2={y} stroke="#d4d4d8" strokeWidth="1.5" />
          </g>
        );
      })}

      <circle cx={noteX} cy={noteY} r="18" fill="#e94560" stroke="#ffffff" strokeWidth="2" />
      <text x={noteX} y={noteY + 6} fill="#ffffff" fontSize="18" fontWeight="700" textAnchor="middle">
        {position.fret}
      </text>
    </svg>
  );
}
