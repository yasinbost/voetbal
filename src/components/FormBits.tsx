'use client';

import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/action-state';

export function SubmitButton({
  children,
  className = 'btn',
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (
        <>
          <span className="spinner" /> {pendingLabel ?? 'Kaydediliyor…'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Notice({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p className={`notice ${state.ok ? 'ok' : 'error'}`} role="status">
      {state.message}
    </p>
  );
}
