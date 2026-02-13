import { useEffect } from 'react';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-surface-1 w-full sm:max-w-sm sm:rounded-lg border border-surface-5 rounded-t-2xl sm:rounded-t-lg p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-txt">{title}</h3>
        <p className="text-sm text-txt-muted mt-2">{message}</p>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            className={`flex-1 ${variant === 'danger' ? '!bg-red-500 hover:!bg-red-600 !text-white' : ''}`}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
