import { useState, useEffect, useMemo } from 'react';
import type { Player } from '../db/database';
import type { FormationTemplate } from './formations';

interface SoccerFieldProps {
  formation: FormationTemplate;
  assignments: Record<string, number>;
  players: Player[];
  positions: Record<string, { x: number; y: number }>;   // slotId -> resolved (x,y) data coords
  labels: Record<string, string>;                          // slotId -> position label
  detectedFormation: string | null;
  highlightSlotId: string | null;
  onSlotPointerDown: (e: React.PointerEvent, slotId: string) => void;
  onSlotClick: (slotId: string) => void;
  onSlotDoubleClick?: (slotId: string) => void;
  pendingAssign: boolean;
  fieldRef: React.RefObject<SVGSVGElement | null>;
  roleTags?: Record<string, string>;
  // Tactical lines
  defensiveLine?: number;
  pressingLine?: number;
  onDefensiveLineDrag?: (y: number) => void;
  onPressingLineDrag?: (y: number) => void;
  // Freeform drop preview
  highlightDropPos?: { x: number; y: number } | null;
}

/** Read the current --accent RGB channels and return a usable color string */
function getAccentColor(): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  if (!raw) return '#1a56db';
  const parts = raw.split(/\s+/);
  if (parts.length === 3) return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  return raw;
}

function getAccent2Color(): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim();
  if (!raw) return getAccentColor();
  const parts = raw.split(/\s+/);
  if (parts.length === 3) return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  return raw;
}

export default function SoccerField({
  formation,
  assignments,
  players,
  positions,
  labels,
  detectedFormation,
  highlightSlotId,
  onSlotPointerDown,
  onSlotClick,
  onSlotDoubleClick,
  pendingAssign,
  fieldRef,
  roleTags,
  defensiveLine,
  pressingLine,
  onDefensiveLineDrag,
  onPressingLineDrag,
  highlightDropPos,
}: SoccerFieldProps) {
  const accent = useMemo(getAccentColor, []);
  const accent2 = useMemo(getAccent2Color, []);
  const jerseyFill = accent;
  const outlineColor = accent2;

  // Tactical line drag state
  const [draggingLine, setDraggingLine] = useState<'defensive' | 'pressing' | null>(null);

  useEffect(() => {
    if (!draggingLine) return;
    const svg = fieldRef.current;
    if (!svg) return;
    const onMove = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      const svgY = ((e.clientY - rect.top) / rect.height) * 100;
      const dataY = Math.max(5, Math.min(95, 100 - svgY));
      if (draggingLine === 'defensive') onDefensiveLineDrag?.(dataY);
      else onPressingLineDrag?.(dataY);
    };
    const onUp = () => setDraggingLine(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingLine, fieldRef, onDefensiveLineDrag, onPressingLineDrag]);

  // Collect the set of slotIds that are assigned so we know which formation slots are filled
  const assignedSlotIds = new Set(Object.keys(assignments));

  return (
    <svg
      ref={fieldRef}
      viewBox="0 0 100 100"
      className="w-full rounded"
      style={{ touchAction: 'none' }}
    >
      {/* Field background */}
      <rect x="0" y="0" width="100" height="100" fill="var(--field-green)" />

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

      {/* ═══ Tactical Lines ═══ */}
      {defensiveLine != null && (
        <g>
          <line
            x1="3" y1={100 - defensiveLine}
            x2="97" y2={100 - defensiveLine}
            stroke="#f59e0b"
            strokeWidth="0.5"
            strokeDasharray="2 1.5"
            opacity="0.7"
          />
          <text
            x="97" y={100 - defensiveLine - 1.2}
            textAnchor="end"
            fill="#f59e0b"
            fontSize="1.8"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
            opacity="0.8"
          >
            DEF BLOCK
          </text>
          {/* Wider invisible drag handle */}
          <rect
            x="3" y={100 - defensiveLine - 2.5}
            width="94" height="5"
            fill="transparent"
            style={{ cursor: 'ns-resize' }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setDraggingLine('defensive'); }}
          />
        </g>
      )}

      {pressingLine != null && (
        <g>
          <line
            x1="3" y1={100 - pressingLine}
            x2="97" y2={100 - pressingLine}
            stroke="#ef4444"
            strokeWidth="0.5"
            strokeDasharray="2 1.5"
            opacity="0.7"
          />
          <text
            x="97" y={100 - pressingLine - 1.2}
            textAnchor="end"
            fill="#ef4444"
            fontSize="1.8"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
            opacity="0.8"
          >
            PRESS LINE
          </text>
          <rect
            x="3" y={100 - pressingLine - 2.5}
            width="94" height="5"
            fill="transparent"
            style={{ cursor: 'ns-resize' }}
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setDraggingLine('pressing'); }}
          />
        </g>
      )}

      {/* Formation label */}
      {detectedFormation && (
        <text
          x="50" y="4"
          textAnchor="middle"
          fill={accent}
          fontSize="3.5"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {detectedFormation}
        </text>
      )}

      {/* ═══ Empty formation ghost slots (visual guide) ═══ */}
      {formation.slots.map(slot => {
        if (assignedSlotIds.has(slot.id)) return null;
        const svgX = slot.x;
        const svgY = 100 - slot.y;
        const isHighlighted = highlightSlotId === slot.id;
        const isAssignTarget = pendingAssign;

        return (
          <g
            key={`ghost-${slot.id}`}
            onPointerDown={(e) => onSlotPointerDown(e, slot.id)}
            onClick={() => onSlotClick(slot.id)}
            className="cursor-pointer"
          >
            {(isHighlighted || isAssignTarget) && (
              <circle cx={svgX} cy={svgY} r="5.8" fill="none" stroke={outlineColor} strokeWidth="0.6" opacity="0.8">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={svgX} cy={svgY} r="4.5"
              fill="rgba(255,255,255,0.1)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="0.3"
              strokeDasharray="1.5 1"
            />
            <text
              x={svgX} y={svgY + 1.5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize="2.5"
              fontWeight="bold"
              fontFamily="system-ui, sans-serif"
            >
              {slot.label}
            </text>
            <text
              x={svgX} y={svgY + 7}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="1.8"
              fontFamily="system-ui, sans-serif"
            >
              {slot.label}
            </text>
          </g>
        );
      })}

      {/* ═══ Freeform drop preview ═══ */}
      {highlightDropPos && (
        <circle
          cx={highlightDropPos.x}
          cy={100 - highlightDropPos.y}
          r="4.5"
          fill="rgba(255,255,255,0.15)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.5"
          strokeDasharray="1.5 1"
        >
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1s" repeatCount="indefinite" />
        </circle>
      )}

      {/* ═══ Placed players (formation-slotted and freeform) ═══ */}
      {Object.entries(assignments).map(([slotId, playerId]) => {
        const pos = positions[slotId];
        if (!pos) return null;
        const player = players.find(p => p.id === playerId);
        if (!player) return null;

        const svgX = pos.x;
        const svgY = 100 - pos.y;
        const isHighlighted = highlightSlotId === slotId;
        const roleTag = roleTags?.[slotId];
        const label = labels[slotId];

        return (
          <g
            key={slotId}
            onPointerDown={(e) => onSlotPointerDown(e, slotId)}
            onClick={() => onSlotClick(slotId)}
            onDoubleClick={() => onSlotDoubleClick?.(slotId)}
            className="cursor-pointer"
          >
            {/* Highlight ring */}
            {isHighlighted && (
              <circle cx={svgX} cy={svgY} r="5.8" fill="none" stroke={outlineColor} strokeWidth="0.6" opacity="0.8">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Position label pill above circle */}
            {label && (
              <g>
                <rect
                  x={svgX - (label.length * 1.6 + 3) / 2}
                  y={svgY - 9.5}
                  width={label.length * 1.6 + 3}
                  height="3.5"
                  rx="1.5"
                  fill="rgba(0,0,0,0.55)"
                />
                <text
                  x={svgX}
                  y={svgY - 7}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.9)"
                  fontSize="2"
                  fontWeight="600"
                  fontFamily="system-ui, sans-serif"
                >
                  {label}
                </text>
              </g>
            )}

            {/* Jersey circle */}
            <circle
              cx={svgX} cy={svgY} r="4.5"
              fill={jerseyFill}
              stroke="white"
              strokeWidth="0.5"
            />

            {/* Jersey number */}
            <text
              x={svgX}
              y={svgY + 1.5}
              textAnchor="middle"
              fill="white"
              fontSize="3.5"
              fontWeight="bold"
              fontFamily="system-ui, sans-serif"
            >
              {player.jerseyNumber}
            </text>

            {/* Player last name */}
            <text
              x={svgX}
              y={svgY + 7}
              textAnchor="middle"
              fill="white"
              fontSize="2.2"
              fontFamily="system-ui, sans-serif"
            >
              {player.name.split(' ').pop() ?? ''}
            </text>

            {/* Role tag */}
            {roleTag && (
              <text
                x={svgX}
                y={svgY + 9.5}
                textAnchor="middle"
                fill={outlineColor}
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
