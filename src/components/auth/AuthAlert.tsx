import { AlertCircle } from 'lucide-react';

/**
 * Inline form-level error for the auth flow, placed right above the submit
 * button so the message lands where the user is looking. The `role="alert"`
 * region is always mounted (and zero-height when empty) so screen readers
 * announce the message as soon as it is inserted.
 */
export function AuthAlert({ message }: { message?: string | null }) {
  return (
    <div role="alert">
      {message && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-danger-subtle px-3 py-2.5 text-sm text-danger">
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
