import React from 'react';
import { UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendantTagProps {
  /** `conversations.assigned_user_id` — an auth.users id. */
  assignedUserId: string | null;
  /** Team members, each carrying its own `user_id` (auth id). */
  teamMembers: { id: string; name: string; user_id?: string | null }[];
  className?: string;
  /** Compact form for the queue list, where space is tight. */
  compact?: boolean;
}

/**
 * Tag showing which attendant a conversation was routed to.
 *
 * DERIVED from `assigned_user_id` rather than written into
 * `conversations.tags`. That array is currently dead data, and the UI merges
 * `conversations.tags` with `contacts.tags` into one list which is then written
 * back to `contacts.tags` (see ChatInterface.handleToggleTag) — so storing an
 * attendant tag there would leak it onto the contact and drift the moment
 * someone transfers the conversation. Deriving keeps `assigned_user_id` the
 * single source of truth, per docs/integra-connect/architecture/01-dominio.md.
 *
 * Renders nothing when unassigned: an "unassigned" chip on every unrouted
 * conversation would be noise on the busiest screen in the product.
 */
export const AttendantTag: React.FC<AttendantTagProps> = ({ assignedUserId, teamMembers, className, compact }) => {
  if (!assignedUserId) return null;

  const member = teamMembers.find((m) => m.user_id === assignedUserId);
  // A conversation can outlive the account it was assigned to; naming that is
  // more useful to a supervisor than showing a bare id or nothing at all.
  const name = member?.name ?? 'Atendente removido';
  const firstName = name.split(' ')[0];

  return (
    <span
      title={`Direcionado para ${name}`}
      className={cn(
        'inline-flex items-center gap-1 rounded border border-primary/25 bg-primary/10 font-medium text-primary',
        compact ? 'px-1 py-0 text-[10px]' : 'px-1.5 py-0.5 text-[11px]',
        className,
      )}
    >
      <UserCheck className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {compact ? firstName : name}
    </span>
  );
};

export default AttendantTag;
