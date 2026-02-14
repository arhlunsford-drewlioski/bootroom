export interface IcsEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date | null;
  location: string;
  description: string;
}

/** Parse raw ICS text into an array of calendar events */
export function parseIcs(text: string): IcsEvent[] {
  // Unfold continuation lines (RFC 5545 §3.1) and normalise line endings
  const unfolded = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '');

  const events: IcsEvent[] = [];
  const veventRe = /BEGIN:VEVENT\n([\s\S]*?)END:VEVENT/g;
  let m: RegExpExecArray | null;

  while ((m = veventRe.exec(unfolded)) !== null) {
    const props = parseProps(m[1]);

    const summary = unesc(props.get('SUMMARY') ?? '');
    const dtRaw = props.get('DTSTART') ?? '';
    if (!summary || !dtRaw) continue;

    const dtstart = parseIcsDate(dtRaw);
    if (!dtstart) continue;

    events.push({
      uid: props.get('UID') ?? crypto.randomUUID(),
      summary,
      dtstart,
      dtend: parseIcsDate(props.get('DTEND') ?? ''),
      location: unesc(props.get('LOCATION') ?? ''),
      description: unesc(props.get('DESCRIPTION') ?? ''),
    });
  }

  return events;
}

// ── helpers ──────────────────────────────────────────────────────────

function parseProps(block: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of block.split('\n')) {
    const ci = line.indexOf(':');
    if (ci < 1) continue;
    const name = line.substring(0, ci).split(';')[0];
    map.set(name, line.substring(ci + 1));
  }
  return map;
}

function parseIcsDate(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;

  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(v)) {
    return new Date(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), 9, 0);
  }

  // DateTime: YYYYMMDDTHHMMSS[Z]
  const dm = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!dm) return null;

  const [, ys, ms, ds, hs, mins, ss, z] = dm;
  if (z === 'Z') {
    return new Date(Date.UTC(+ys, +ms - 1, +ds, +hs, +mins, +ss));
  }
  return new Date(+ys, +ms - 1, +ds, +hs, +mins, +ss);
}

function unesc(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\');
}
