/**
 * 指板图 SVG 组件
 * 用于展示吉他指板、高亮品格、接收点击输入
 */
import { useId, type MouseEvent } from 'react';
import { formatPosition, getPositionId, isSamePosition } from '../../domain/theory';
import type { FretPosition, GuitarString } from '../../types/theory';

export interface FretboardPositionLabel {
  text: string;
  tone: 'natural' | 'accidental' | 'neutral';
  fill?: string;
  stroke?: string;
  textColor?: string;
  muted?: boolean;
}

export type FretboardPositionState = 'selected' | 'correct' | 'missed' | 'extra';

interface FretboardProps {
  fretCount?: number;
  highlightedPosition?: FretPosition;
  selectedPositions?: FretPosition[];
  positionStates?: Record<string, FretboardPositionState>;
  getPositionLabel?: (position: FretPosition) => FretboardPositionLabel | string | null;
  onPositionClick?: (position: FretPosition) => void;
}

const POSITION_STATE_STYLES: Record<FretboardPositionState, { fill: string; stroke: string }> = {
  selected: { fill: '#38bdf8', stroke: '#ffffff' },
  correct: { fill: '#16a34a', stroke: '#bbf7d0' },
  missed: { fill: '#ca8a04', stroke: '#fef08a' },
  extra: { fill: '#e11d48', stroke: '#fecdd3' },
};

const POSITION_STATE_MARKS: Partial<Record<FretboardPositionState, string>> = {
  selected: '+',
  correct: '✓',
  missed: '!',
  extra: '×',
};

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
  positionStates = {},
  getPositionLabel,
  onPositionClick,
}: FretboardProps) {
  const scrollHintId = useId();
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

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  function getNearestPosition(clientX: number, clientY: number, svgElement: SVGSVGElement): FretPosition {
    const rect = svgElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * width;
    const y = ((clientY - rect.top) / rect.height) * height;
    const nearestString = clamp(Math.round((y - top) / stringSpacing) + 1, 1, STRINGS.length) as GuitarString;
    const nearestFret = clamp(Math.round((x - left) / fretSpacing + 0.5), 0, fretCount);

    return {
      string: nearestString,
      fret: nearestFret,
    };
  }

  function handleSvgClick(event: MouseEvent<SVGSVGElement>): void {
    if (onPositionClick !== undefined) {
      onPositionClick(getNearestPosition(event.clientX, event.clientY, event.currentTarget));
    }
  }

  return (
    <div className="min-w-0">
      <p id={scrollHintId} className="mb-2 text-xs text-slate-400 sm:hidden">
        指板可横向滑动，右侧还有品位。
      </p>
      <div className="relative min-w-0">
        <div
          data-testid="fretboard-scroll"
          className="overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch]"
          tabIndex={0}
          aria-describedby={scrollHintId}
          aria-label={`可横向滚动的吉他指板，显示 0 到 ${fretCount} 品`}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={`block w-full min-w-[520px] sm:min-w-0 ${onPositionClick !== undefined ? 'cursor-pointer touch-manipulation' : ''}`}
            role="img"
            aria-label="吉他指板"
            onClick={handleSvgClick}
          >
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
          const positionState = positionStates[getPositionId(position)];
          const isHighlighted = highlightedPosition !== undefined && isSamePosition(position, highlightedPosition);
          const isSelected = selectedPositions.some((selected) => isSamePosition(selected, position));
          const x = getFretCenterX(fret);
          const y = getStringY(string);
          const stateStyle = positionState === undefined ? null : POSITION_STATE_STYLES[positionState];
          const fill = isHighlighted ? '#e94560' : stateStyle?.fill ?? (isSelected ? '#38bdf8' : 'transparent');
          const stroke = isHighlighted ? '#ffffff' : stateStyle?.stroke ?? (isSelected ? '#ffffff' : 'transparent');
          const rawLabel = getPositionLabel?.(position);
          const label = typeof rawLabel === 'string' ? { text: rawLabel, tone: 'neutral' as const } : rawLabel;
          const hasLabel = label !== null && label !== undefined;
          const labelFill = label?.tone === 'accidental' ? '#7dd3fc' : label?.tone === 'natural' ? '#f8fafc' : '#e2e8f0';
          const circleFill = label?.tone === 'accidental' ? '#164e63' : label?.tone === 'natural' ? '#1e293b' : '#0f172a';
          const circleStroke = label?.tone === 'accidental' ? '#67e8f9' : label?.tone === 'natural' ? '#cbd5e1' : '#64748b';
          const resolvedFill = label?.muted ? '#1f2937' : label?.fill ?? circleFill;
          const resolvedStroke = label?.muted ? '#475569' : label?.stroke ?? circleStroke;
          const resolvedText = label?.muted ? '#94a3b8' : label?.textColor ?? labelFill;
          const stateMark = positionState === undefined ? null : POSITION_STATE_MARKS[positionState] ?? null;

          return (
            <g
              key={getPositionId(position)}
              role="button"
              aria-label={`播放 ${formatPosition(position)}`}
              tabIndex={onPositionClick ? 0 : -1}
              onClick={(event) => {
                event.stopPropagation();
                onPositionClick?.(position);
              }}
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
                r={hasLabel ? 18 : 15}
                fill={hasLabel ? (isHighlighted ? '#e94560' : stateStyle?.fill ?? (isSelected ? '#38bdf8' : resolvedFill)) : fill}
                stroke={hasLabel ? (isHighlighted ? '#ffffff' : stateStyle?.stroke ?? (isSelected ? '#ffffff' : resolvedStroke)) : stroke}
                strokeWidth={hasLabel ? (label?.muted ? 1 : 2) : 2}
                className="transition-opacity hover:opacity-80"
              />
              {hasLabel && (
                <text
                  x={x}
                  y={y + 5}
                  fill={resolvedText}
                  fontSize={label.text.length > 2 ? 10 : 14}
                  fontWeight="800"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {label.text}
                </text>
              )}
              {!hasLabel && stateMark !== null && (
                <text
                  x={x}
                  y={y + 6}
                  fill="#ffffff"
                  fontSize={18}
                  fontWeight="900"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {stateMark}
                </text>
              )}
            </g>
          );
        })
      ))}
          </svg>
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#242131] to-transparent sm:hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
