import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export default function Textarea({ label, className = '', ...props }: TextareaProps) {
  const base = `w-full rounded-md border border-surface-5 bg-surface-0 px-3 py-2 text-sm text-txt placeholder:text-txt-faint focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors resize-none ${className}`;

  return label ? (
    <div>
      <label className="block text-xs font-medium text-txt-muted mb-1">{label}</label>
      <textarea {...props} className={base} />
    </div>
  ) : (
    <textarea {...props} className={base} />
  );
}
