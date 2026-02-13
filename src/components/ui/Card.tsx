import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-lg border border-surface-5 bg-surface-1 p-4 ${className}`}
    >
      {children}
    </div>
  );
}
