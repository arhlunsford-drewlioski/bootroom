import type { SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export default function Select({ label, className = '', children, ...props }: SelectProps) {
  const base = `h-9 w-full rounded-md border border-surface-5 bg-surface-0 px-3 text-sm text-txt focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`;

  return label ? (
    <div>
      <label className="block text-xs font-medium text-txt-muted mb-1">{label}</label>
      <select {...props} className={base}>{children}</select>
    </div>
  ) : (
    <select {...props} className={base}>{children}</select>
  );
}
