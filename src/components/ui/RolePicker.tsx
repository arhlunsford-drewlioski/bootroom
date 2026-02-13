import { useState } from 'react';
import { ROLE_TAGS } from '../../constants/tags';
import Input from './Input';

interface RolePickerProps {
  value: string | undefined;
  onChange: (role: string | undefined) => void;
  className?: string;
}

export default function RolePicker({ value, onChange, className = '' }: RolePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');

  const isCustom = value != null && !ROLE_TAGS.includes(value as typeof ROLE_TAGS[number]);

  const handleChange = (val: string) => {
    if (val === '') {
      onChange(undefined);
      setShowCustom(false);
    } else if (val === '__custom__') {
      setShowCustom(true);
      setCustomText(isCustom && value ? value : '');
    } else {
      onChange(val);
      setShowCustom(false);
    }
  };

  const commitCustom = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      onChange(trimmed);
    }
    setShowCustom(false);
  };

  return (
    <div className={className}>
      <select
        value={showCustom ? '__custom__' : (isCustom ? '__custom__' : (value ?? ''))}
        onChange={e => handleChange(e.target.value)}
        className="h-9 w-full rounded-md border border-surface-5 bg-surface-0 px-3 text-sm text-txt focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
      >
        <option value="">-- No Role --</option>
        {ROLE_TAGS.map(role => (
          <option key={role} value={role}>{role}</option>
        ))}
        <option value="__custom__">Custom...</option>
      </select>
      {showCustom && (
        <div className="flex gap-2 mt-1.5">
          <Input
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder="Custom role..."
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitCustom(); } }}
          />
          <button
            type="button"
            onClick={commitCustom}
            className="h-9 px-3 rounded-md text-sm bg-surface-3 text-txt-muted hover:bg-surface-4 hover:text-txt transition-colors shrink-0"
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}
