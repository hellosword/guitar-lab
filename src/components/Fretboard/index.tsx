/**
 * 指板图 SVG 组件
 * 用于展示吉他指板、高亮品格、接收点击输入
 */
import { formatPosition, getPositionId, isSamePosition } from '../../lib/theory';
import type { FretPosition } from '../../types/theory';

interface FretboardProps {
  fretCount?: number;
  highlightedPosition?: FretPosition;
  selectedPositions?: FretPosition[];
  onPositionClick?: (position: FretPosition) => void;
}

const STRINGS = [1, 2, 3, 4, 5, 6] as const;
const STRING_LABELS: Record<number, string> = {
  1: '1弦',
  2: '2弦',
  3: '3弦',
  4: '4弦',
  5: '5弦',
  6: '6弦',
};

export default function Fretboard({
  fretCount = 5,
  highlightedPosition,
  selectedPositions = [],
  onPositionClick,
}: FretboardProps) {
  const width = 760;
  const height = 260;
  const left = 74;
  const right = 28;
  const top = 28;
  const bottom = 36;
  const boardWidth = width - left - right;
  const boardHeight = height - top - bottom;
  const fretSpacing = boardWidth / (fretCount + 1);
  const stringSpacing = boardHeight / (STRINGS.length - 1);

  function getStringY(string: number): number {
    return top + (string - 1) * stringSpacing;
  }

  function getFretCenterX(fret: number): number {
    if (fret === 0) {
      return left - 28;
    }

    return left + (fret - 0.5) * fretSpacing;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="吉他指板">
      <rect x={left} y={top - 14} width={boardWidth} height={boardHeight + 28} rx="8" fill="#241f2f" />

      {Array.from({ length: fretCount + 2 }, (_, fretIndex) => {
        const x = left + fretIndex * fretSpacing;
        const isNut = fretIndex === 0;

        return (
          <line
            key={`fret-${fretIndex}`}
            x1={x}
            y1={top - 14}
            x2={x}
            y2={top + boardHeight + 14}
            stroke={isNut ? '#f8fafc' : '#7f8497'}
            strokeWidth={isNut ? 5 : 2}
          />
        );
      })}

      {STRINGS.map((string) => {
        const y = getStringY(string);
        const strokeWidth = 1.4 + string * 0.34;

        return (
          <g key={`string-${string}`}>
            <text x={24} y={y + 5} fill="#cbd5e1" fontSize="15">
              {STRING_LABELS[string]}
            </text>
            <line x1={left - 34} y1={y} x2={left + boardWidth} y2={y} stroke="#d4d4d8" strokeWidth={strokeWidth} />
          </g>
        );
      })}

      {Array.from({ length: fretCount + 1 }, (_, fret) => (
        <text key={`fret-label-${fret}`} x={getFretCenterX(fret)} y={height - 10} fill="#94a3b8" fontSize="14" textAnchor="middle">
          {fret}
        </text>
      ))}

      {STRINGS.flatMap((string) => (
        Array.from({ length: fretCount + 1 }, (_, fret) => {
          const position: FretPosition = { string, fret };
          const isHighlighted = highlightedPosition !== undefined && isSamePosition(position, highlightedPosition);
          const isSelected = selectedPositions.some((selected) => isSamePosition(selected, position));
          const x = getFretCenterX(fret);
          const y = getStringY(string);
          const fill = isHighlighted ? '#e94560' : isSelected ? '#38bdf8' : 'transparent';
          const stroke = isHighlighted || isSelected ? '#ffffff' : 'transparent';

          return (
            <g
              key={getPositionId(position)}
              role="button"
              aria-label={`播放 ${formatPosition(position)}`}
              tabIndex={onPositionClick ? 0 : -1}
              onClick={() => onPositionClick?.(position)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  onPositionClick?.(position);
                }
              }}
              className={onPositionClick ? 'cursor-pointer' : ''}
            >
              <circle
                cx={x}
                cy={y}
                r={15}
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
                className="transition-opacity hover:opacity-80"
              />
            </g>
          );
        })
      ))}
    </svg>
  );
}
