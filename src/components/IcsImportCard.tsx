import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Match, Practice } from '../db/database';
import { parseIcs } from '../utils/ics-parse';
import { classifyEvents } from '../utils/ics-classify';
import type { ClassifiedEvent, EventType } from '../utils/ics-classify';
import { to12Hour } from '../utils/time';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';

type Status = 'idle' | 'preview' | 'importing' | 'done' | 'error';

function HowToGet() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
      >
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-accent text-[10px] font-bold leading-none">i</span>
        How do I get a .ics file?
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-3 space-y-4 text-xs text-txt-muted bg-surface-0 rounded-md border border-surface-5 p-3">
          {/* TeamSnap */}
          <div>
            <p className="font-semibold text-txt mb-1">TeamSnap</p>
            <ol className="list-decimal list-inside space-y-0.5 text-txt-muted">
              <li>Open TeamSnap app or website</li>
              <li>Go to your team's <strong className="text-txt">Schedule</strong></li>
              <li>Tap <strong className="text-txt">Export</strong> or <strong className="text-txt">Sync Calendar</strong></li>
              <li>Choose <strong className="text-txt">Download .ics file</strong></li>
              <li>On iPhone: save to Files app, then upload here</li>
            </ol>
          </div>

          {/* Google Calendar */}
          <div>
            <p className="font-semibold text-txt mb-1">Google Calendar</p>
            <ol className="list-decimal list-inside space-y-0.5 text-txt-muted">
              <li>On a computer, go to <strong className="text-txt">calendar.google.com</strong></li>
              <li>Click the <strong className="text-txt">gear icon</strong> &rarr; <strong className="text-txt">Settings</strong></li>
              <li>Under <strong className="text-txt">Import & export</strong>, click <strong className="text-txt">Export</strong></li>
              <li>A .zip file downloads — unzip it to find .ics files</li>
              <li>Transfer the .ics file to your phone (email, AirDrop, Drive) or import from your computer</li>
            </ol>
            <p className="mt-1 text-txt-faint italic">Note: Google Calendar export is only available on desktop, not the mobile app.</p>
          </div>

          {/* Apple Calendar */}
          <div>
            <p className="font-semibold text-txt mb-1">Apple Calendar</p>
            <p className="text-txt-faint mb-1 font-medium">From Mac:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-txt-muted">
              <li>Open Calendar app on Mac</li>
              <li>In the sidebar, right-click your calendar &rarr; <strong className="text-txt">Export</strong></li>
              <li>Save the .ics file, then transfer to your phone or import here</li>
            </ol>
            <p className="text-txt-faint mb-1 mt-2 font-medium">From iPhone:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-txt-muted">
              <li>iPhone doesn't support full calendar export</li>
              <li>You can share <strong className="text-txt">individual events</strong> by tapping an event &rarr; <strong className="text-txt">Share</strong> &rarr; save to Files</li>
              <li>For a full season import, use a Mac or export from the source (TeamSnap, league site, etc.)</li>
            </ol>
          </div>

          {/* General tip */}
          <div className="pt-2 border-t border-surface-5">
            <p className="text-txt-faint">
              <strong className="text-txt">Tip:</strong> Most league websites and team management apps (TeamSnap, SportsEngine, GameChanger) offer .ics exports of your full schedule. Check your league or app's schedule/export settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IcsImportCard() {
  const teams = useLiveQuery(() => db.teams.toArray()) ?? [];
  const [teamId, setTeamId] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [events, setEvents] = useState<ClassifiedEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState({ matches: 0, practices: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  // auto-select team
  const effectiveTeamId = teamId ?? (teams.length === 1 ? teams[0].id! : null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseIcs(text);
      if (parsed.length === 0) {
        setErrorMsg('No calendar events found in this file.');
        setStatus('error');
        return;
      }

      const classified = classifyEvents(parsed);

      // duplicate detection
      if (effectiveTeamId) {
        await markDuplicates(classified, effectiveTeamId);
      }

      setEvents(classified);
      setStatus('preview');
    } catch {
      setErrorMsg('Could not read the file. Make sure it is a valid .ics calendar export.');
      setStatus('error');
    }
  };

  const handleImport = async () => {
    if (!effectiveTeamId) return;
    setStatus('importing');

    try {
      const matchesToAdd: Omit<Match, 'id'>[] = [];
      const practicesToAdd: Omit<Practice, 'id'>[] = [];

      for (const ev of events) {
        if (ev.skip || ev.type === 'unknown') continue;
        if (ev.type === 'match') {
          matchesToAdd.push({
            teamId: effectiveTeamId,
            opponent: ev.opponent,
            date: ev.date,
            time: ev.time,
            location: ev.location || undefined,
            isHome: ev.isHome,
          });
        } else {
          practicesToAdd.push({
            teamId: effectiveTeamId,
            focus: ev.focus,
            date: ev.date,
            time: ev.time,
            status: 'planned',
            intensity: 5,
            duration: ev.duration,
          });
        }
      }

      await db.transaction('rw', [db.matches, db.practices], async () => {
        if (matchesToAdd.length) await db.matches.bulkAdd(matchesToAdd);
        if (practicesToAdd.length) await db.practices.bulkAdd(practicesToAdd);
      });

      setResult({ matches: matchesToAdd.length, practices: practicesToAdd.length });
      setStatus('done');
    } catch {
      setErrorMsg('Failed to import events. Please try again.');
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setEvents([]);
    setErrorMsg('');
    setResult({ matches: 0, practices: 0 });
    if (fileRef.current) fileRef.current.value = '';
  };

  const setEventType = (uid: string, type: EventType | 'skip') => {
    setEvents(prev => prev.map(ev => {
      if (ev.uid !== uid) return ev;
      if (type === 'skip') return { ...ev, skip: true };
      return { ...ev, type, skip: false };
    }));
  };

  const toggleSkip = (uid: string) => {
    setEvents(prev => prev.map(ev =>
      ev.uid === uid ? { ...ev, skip: !ev.skip } : ev
    ));
  };

  const importable = events.filter(e => !e.skip && e.type !== 'unknown');
  const matchCount = importable.filter(e => e.type === 'match').length;
  const practiceCount = importable.filter(e => e.type === 'practice').length;
  const unknownCount = events.filter(e => e.type === 'unknown' && !e.skip).length;

  const noTeam = teams.length === 0;

  return (
    <Card>
      <h3 className="text-sm font-semibold text-txt-muted uppercase tracking-wider mb-2">
        Import Calendar
      </h3>
      <p className="text-xs text-txt-faint mb-4">
        Import games and practices from a .ics file exported from TeamSnap, Google Calendar, or Apple Calendar.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".ics,.ical"
        onChange={handleFile}
        className="hidden"
      />

      {/* ── idle ── */}
      {status === 'idle' && (
        noTeam ? (
          <p className="text-sm text-txt-muted">Create a team first before importing events.</p>
        ) : (
          <>
            <HowToGet />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Choose .ics File
            </Button>
          </>
        )
      )}

      {/* ── preview ── */}
      {status === 'preview' && (
        <div className="space-y-4">
          {/* team selector */}
          {teams.length > 1 && (
            <Select
              label="Import to team"
              value={effectiveTeamId ?? ''}
              onChange={e => setTeamId(Number(e.target.value) || null)}
            >
              <option value="">Select a team</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          )}

          {/* summary */}
          <p className="text-sm text-txt">
            Found {events.length} event{events.length !== 1 ? 's' : ''}
            {matchCount > 0 && <> &middot; <span className="text-accent">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span></>}
            {practiceCount > 0 && <> &middot; <span className="text-practice-text">{practiceCount} practice{practiceCount !== 1 ? 's' : ''}</span></>}
            {unknownCount > 0 && <> &middot; <span className="text-amber-600">{unknownCount} unclassified</span></>}
          </p>

          {/* event list */}
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-surface-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-txt-muted uppercase border-b border-surface-5 bg-surface-0">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3 hidden sm:table-cell">Time</th>
                  <th className="text-left py-2 px-3">Event</th>
                  <th className="text-left py-2 px-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr
                    key={ev.uid}
                    className={`border-b border-surface-5 last:border-b-0 ${ev.skip ? 'opacity-40' : ''}`}
                  >
                    <td className="py-2 px-3 text-txt whitespace-nowrap">
                      {formatDate(ev.date)}
                    </td>
                    <td className="py-2 px-3 text-txt-muted whitespace-nowrap hidden sm:table-cell">
                      {to12Hour(ev.time)}
                    </td>
                    <td className="py-2 px-3 text-txt max-w-[200px] truncate">
                      {ev.originalSummary}
                      {ev.isDuplicate && (
                        <span className="ml-2 text-xs text-amber-600">Duplicate</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={ev.skip ? 'skip' : ev.type}
                        onChange={e => setEventType(ev.uid, e.target.value as EventType | 'skip')}
                        className="h-7 rounded border border-surface-5 bg-surface-0 px-2 text-xs text-txt focus:outline-none focus:ring-1 focus:ring-accent/40"
                      >
                        <option value="match">Match</option>
                        <option value="practice">Practice</option>
                        <option value="skip">Skip</option>
                      </select>
                      {ev.type === 'unknown' && !ev.skip && (
                        <span className="ml-1 text-xs text-amber-600">?</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* duplicate toggle hint */}
          {events.some(e => e.isDuplicate) && (
            <p className="text-xs text-txt-faint">
              Events marked as duplicates are skipped by default.{' '}
              <button
                className="underline text-accent"
                onClick={() => events.filter(e => e.isDuplicate).forEach(e => toggleSkip(e.uid))}
              >
                Toggle all duplicates
              </button>
            </p>
          )}

          {/* actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleImport}
              disabled={importable.length === 0 || !effectiveTeamId}
            >
              Import {importable.length} Event{importable.length !== 1 ? 's' : ''}
            </Button>
            <Button variant="ghost" onClick={reset}>Cancel</Button>
          </div>

          {unknownCount > 0 && (
            <p className="text-xs text-amber-600">
              {unknownCount} event{unknownCount !== 1 ? 's' : ''} could not be auto-classified. Set them to Match or Practice, or skip them.
            </p>
          )}
        </div>
      )}

      {/* ── importing ── */}
      {status === 'importing' && (
        <p className="text-sm text-txt-muted">Importing events...</p>
      )}

      {/* ── done ── */}
      {status === 'done' && (
        <div className="space-y-2">
          <p className="text-sm text-emerald-400">
            Imported {result.matches} match{result.matches !== 1 ? 'es' : ''} and {result.practices} practice{result.practices !== 1 ? 's' : ''}.
          </p>
          <Button variant="secondary" onClick={reset}>Done</Button>
        </div>
      )}

      {/* ── error ── */}
      {status === 'error' && (
        <div className="space-y-2">
          <p className="text-sm text-red-400">{errorMsg}</p>
          <Button variant="secondary" onClick={reset}>Try Again</Button>
        </div>
      )}
    </Card>
  );
}

// ── helpers ──────────────────────────────────────────────────────────

async function markDuplicates(events: ClassifiedEvent[], teamId: number) {
  const dates = events.map(e => e.date);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  const [existingMatches, existingPractices] = await Promise.all([
    db.matches.where('teamId').equals(teamId).and(m => m.date >= minDate && m.date <= maxDate).toArray(),
    db.practices.where('teamId').equals(teamId).and(p => p.date >= minDate && p.date <= maxDate).toArray(),
  ]);

  const existingKeys = new Set<string>();
  for (const m of existingMatches) existingKeys.add(`${m.date}|${m.time}`);
  for (const p of existingPractices) existingKeys.add(`${p.date}|${p.time}`);

  for (const ev of events) {
    if (existingKeys.has(`${ev.date}|${ev.time}`)) {
      ev.isDuplicate = true;
      ev.skip = true;
    }
  }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
