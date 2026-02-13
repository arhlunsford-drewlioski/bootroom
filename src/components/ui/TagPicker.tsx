import { useState } from 'react';
import Input from './Input';
import Button from './Button';

interface TagPickerProps {
  label?: string;
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  max?: number;
  allowCustom?: boolean;
}

export default function TagPicker({ label, options, selected, onChange, max, allowCustom }: TagPickerProps) {
  const [customInput, setCustomInput] = useState('');

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      if (max != null && selected.length >= max) return;
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    if (max != null && selected.length >= max) return;
    onChange([...selected, trimmed]);
    setCustomInput('');
  };

  return (
    <div>
      {label && <label className="block text-xs font-medium text-txt-muted mb-2">{label}</label>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(tag => {
          const isSelected = selected.includes(tag);
          const isDisabled = !isSelected && max != null && selected.length >= max;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              disabled={isDisabled}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isSelected
                  ? 'bg-accent/20 text-accent border-accent/40'
                  : isDisabled
                    ? 'bg-surface-3 text-txt-faint border-surface-5 opacity-40 cursor-not-allowed'
                    : 'bg-surface-3 text-txt-muted border-surface-5 hover:bg-surface-4 hover:text-txt cursor-pointer'
              }`}
            >
              {tag}
            </button>
          );
        })}
        {/* Show custom tags that aren't in the options list */}
        {selected.filter(t => !options.includes(t)).map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className="px-2.5 py-1 rounded-full text-xs font-medium border bg-accent/20 text-accent border-accent/40 transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2 mt-2">
          <Input
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            placeholder="Custom tag..."
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          />
          <Button variant="secondary" onClick={addCustom} type="button">Add</Button>
        </div>
      )}
    </div>
  );
}
