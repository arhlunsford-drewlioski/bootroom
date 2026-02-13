import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** optional label rendered above the input */
  label?: string;
};

export default function Input({ label, className = '', ...props }: InputProps) {
  return label ? (
    <div>
      <label className="block text-xs font-medium text-txt-muted mb-1">{label}</label>
      <input
        {...props}
        className={`h-9 w-full rounded-md border border-surface-5 bg-surface-0 px-3 text-sm text-txt placeholder:text-txt-faint focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
      />
    </div>
  ) : (
    <input
      {...props}
      className={`h-9 w-full rounded-md border border-surface-5 bg-surface-0 px-3 text-sm text-txt placeholder:text-txt-faint focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
    />
  );
}
