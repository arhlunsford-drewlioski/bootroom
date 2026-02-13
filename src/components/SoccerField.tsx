import type { Player } from '../db/database';
import type { FormationTemplate } from './formations';

interface SoccerFieldProps {
  formation: FormationTemplate;
  assignments: Record<string, number>;
  players: Player[];
  detectedFormation: string | null;
  highlightSlotId: string | null;
  onSlotPointerDown: (e: React.PointerEvent, slotId: string) => void;
  onSlotClick: (slotId: string) => void;
  onSlotDoubleClick?: (slotId: string) => void;
  pendingAssign: boolean;
  fieldRef: React.RefObject<SVGSVGElement | null>;
  roleTags?: Record<string, string>;
}

export default function SoccerField({
  formation,
  assignments,
  players,
  detectedFormation,
  highlightSlotId,
  onSlotPointerDown,
  onSlotClick,
  onSlotDoubleClick,
  pendingAssign,
  fieldRef,
  roleTags,
}: SoccerFieldProps) {
  return (
    <svg
      ref={fieldRef}
      viewBox="0 0 100 100"
      className="w-full rounded"
      style={{ touchAction: 'none' }}
    >
      {/* Field background */}
      <rect x="0" y="0" width="100" height="100" fill="#15803d" />

      {/* Field outline */}
      <rect x="1" y="1" width="98" height="98" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.6" />

      {/* Halfway line */}
      <line x1="1" y1="50" x2="99" y2="50" stroke="white" strokeWidth="0.4" strokeOpacity="0.5" />

      {/* Center circle */}
      <circle cx="50" cy="50" r="10" fill="none" stroke="white" strokeWidth="0.4" strokeOpacity="0.5" />
      <circle cx="50" cy="50" r="0.8" fill="white" fillOpacity="0.5" />

      {/* Top penalty box (opponent goal) */}
      <rect x="25" y="1" width="50" height="14" fill="none" stroke="white" strokeWidth="0.4" strokeOpacity="0.5" />
      <rect x="35" y="1" width="30" height="6" fill="none" stroke="white" strokeWidth="0.4" strokeOpacity="0.5" />
      <path d="M 35 15 Q 50 22 65 15" fill="none" stroke="white" strokeWidth="0.4" strokeOpacity="0.5" />

      {/* Bottom penalty box (own goal) */}
      <rect x="25" y="85" width="50" height="14" fill="none" stroke="white" strokeWidth="0.4" strokeOpacity="0.5" />
      <rect x="35" y="93" width="30" height="6" fill="none" stroke="white" strokeWidth="0.4" strokeOpacity="0.5" />
      <path d="M 35 85 Q 50 78 65 85" fill="none" stroke="white" strokeWidth="0.4" strokeOpacity="0.5" />

      {/* Corner arcs */}
      <path d="M 1 4 Q 4 4 4 1" fill="none" stroke="white" strokeWidth="0.3" strokeOpacity="0.4" />
      <path d="M 96 1 Q 96 4 99 4" fill="none" stroke="white" strokeWidth="0.3" strokeOpacity="0.4" />
      <path d="M 1 96 Q 4 96 4 99" fill="none" stroke="white" strokeWidth="0.3" strokeOpacity="0.4" />
      <path d="M 96 99 Q 96 96 99 96" fill="none" stroke="white" strokeWidth="0.3" strokeOpacity="0.4" />

      {/* Formation label */}
      {detectedFormation && (
        <text
          x="50" y="4"
          textAnchor="middle"
          fill="#FF2E63"
          fontSize="3.5"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {detectedFormation}
        </text>
      )}

      {/* Position slots */}
      {formation.slots.map(slot => {
        const svgX = slot.x;
        const svgY = 100 - slot.y; // flip Y: 0=bottom in data, 0=top in SVG
        const playerId = assignments[slot.id];
        const player = playerId != null ? players.find(p => p.id === playerId) : null;
        const isFilled = player != null;
        const isHighlighted = highlightSlotId === slot.id;
        const isAssignTarget = pendingAssign && !isFilled;
        const roleTag = roleTags?.[slot.id];

        return (
          <g
            key={slot.id}
            onPointerDown={(e) => onSlotPointerDown(e, slot.id)}
            onClick={() => onSlotClick(slot.id)}
            onDoubleClick={() => onSlotDoubleClick?.(slot.id)}
            className="cursor-pointer"
          >
            {/* Highlight ring */}
            {(isHighlighted || isAssignTarget) && (
              <circle cx={svgX} cy={svgY} r="5.8" fill="none" stroke="#FF2E63" strokeWidth="0.6" opacity="0.8">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Jersey circle */}
            <circle
              cx={svgX}
              cy={svgY}
              r="4.5"
              fill={isFilled ? '#FF2E63' : 'rgba(255,255,255,0.1)'}
              stroke={isFilled ? 'white' : 'rgba(255,255,255,0.3)'}
              strokeWidth={isFilled ? '0.5' : '0.3'}
              strokeDasharray={isFilled ? 'none' : '1.5 1'}
            />

            {/* Jersey number or position label */}
            <text
              x={svgX}
              y={svgY + 1.5}
              textAnchor="middle"
              fill={isFilled ? '#141e30' : 'rgba(255,255,255,0.5)'}
              fontSize={isFilled ? '3.5' : '2.5'}
              fontWeight="bold"
              fontFamily="system-ui, sans-serif"
            >
              {isFilled ? player!.jerseyNumber : slot.label}
            </text>

            {/* Player last name (filled) or position label below (empty) */}
            <text
              x={svgX}
              y={svgY + 7}
              textAnchor="middle"
              fill={isFilled ? 'white' : 'rgba(255,255,255,0.3)'}
              fontSize={isFilled ? '2.2' : '1.8'}
              fontFamily="system-ui, sans-serif"
            >
              {isFilled ? (player!.name.split(' ').pop() ?? '') : slot.label}
            </text>

            {/* Role tag */}
            {isFilled && roleTag && (
              <text
                x={svgX}
                y={svgY + 9.5}
                textAnchor="middle"
                fill="#FF2E63"
                fontSize="1.6"
                fontFamily="system-ui, sans-serif"
                opacity="0.8"
              >
                {roleTag}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
