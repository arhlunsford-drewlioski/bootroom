import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const styles: Record<Variant, string> = {
  primary:
    'bg-accent text-surface-0 font-semibold hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed',
  secondary:
    'bg-surface-3 text-txt-muted hover:bg-surface-4 hover:text-txt disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:
    'text-txt-muted hover:text-txt disabled:opacity-40 disabled:cursor-not-allowed',
};

export default function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`h-9 px-4 rounded-md text-sm transition-colors ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
