import type { IcsEvent } from './ics-parse';
import { toDateStr } from './time';

export type EventType = 'match' | 'practice' | 'unknown';

export interface ClassifiedEvent {
  uid: string;
  originalSummary: string;
  type: EventType;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  opponent: string;   // match-specific (or summary fallback)
  location: string;
  isHome: boolean;
  focus: string;      // practice-specific (or summary fallback)
  duration: number;   // minutes
  skip: boolean;
  isDuplicate: boolean;
}

const MATCH_KW = /\b(game|match|vs\.?|versus|v\.|fixture|cup|league|tournament|scrimmage|friendly)\b/i;
const PRACTICE_KW = /\b(practice|training|session|drill|conditioning|camp)\b/i;
const VS_RE = /(?:vs\.?|versus|v\.)\s+(.+)$/i;

export function classifyEvents(events: IcsEvent[]): ClassifiedEvent[] {
  return events.map(ev => {
    const type = detectType(ev.summary);
    const { opponent, isHome } = extractOpponent(ev.summary);
    const duration = computeDuration(ev.dtstart, ev.dtend);

    return {
      uid: ev.uid,
      originalSummary: ev.summary,
      type,
      date: toDateStr(ev.dtstart),
      time: fmtTime(ev.dtstart),
      opponent,
      location: ev.location,
      isHome,
      focus: ev.summary,
      duration,
      skip: false,
      isDuplicate: false,
    };
  });
}

function detectType(summary: string): EventType {
  if (MATCH_KW.test(summary)) return 'match';
  if (PRACTICE_KW.test(summary)) return 'practice';
  return 'unknown';
}

export function extractOpponent(summary: string): { opponent: string; isHome: boolean } {
  let isHome = true;
  if (/\baway\b/i.test(summary)) isHome = false;

  const vsMatch = VS_RE.exec(summary);
  if (vsMatch) return { opponent: vsMatch[1].trim(), isHome };

  // "Game - Eagles" pattern
  const dashParts = summary.split(/\s+-\s+/);
  if (dashParts.length >= 2) return { opponent: dashParts[dashParts.length - 1].trim(), isHome };

  return { opponent: summary, isHome };
}

function computeDuration(start: Date, end: Date | null): number {
  if (!end) return 90;
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  if (mins < 15 || mins > 300) return 90;
  return mins;
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
