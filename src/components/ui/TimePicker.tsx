import { to24Hour } from '../../utils/time';

interface TimePickerProps {
  label?: string;
  value: string;              // "HH:mm" 24-hour format
  onChange: (hhmm: string) => void;
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function parse(hhmm: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [h, m] = (hhmm || '12:00').split(':').map(Number);
  return {
    hour: h % 12 || 12,
    minute: m,
    period: h >= 12 ? 'PM' : 'AM',
  };
}

/** Snap a raw minute value to the nearest 5-min increment */
function snapMinute(m: number): number {
  return Math.round(m / 5) * 5 % 60;
}

const selectBase =
  'h-9 rounded-md border border-surface-5 bg-surface-0 px-2 text-sm text-txt focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors';

export default function TimePicker({ label, value, onChange, className = '' }: TimePickerProps) {
  const { hour, minute, period } = parse(value);
  const snapped = snapMinute(minute);

  const emit = (h: number, m: number, p: 'AM' | 'PM') => onChange(to24Hour(h, m, p));

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-txt-muted mb-1">{label}</label>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Hour */}
        <select
          value={hour}
          onChange={e => emit(Number(e.target.value), snapped, period)}
          className={selectBase}
        >
          {HOURS.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        {/* Minute */}
        <select
          value={snapped}
          onChange={e => emit(hour, Number(e.target.value), period)}
          className={selectBase}
        >
          {MINUTES.map(m => (
            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>

        {/* AM / PM */}
        <select
          value={period}
          onChange={e => emit(hour, snapped, e.target.value as 'AM' | 'PM')}
          className={selectBase}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}
