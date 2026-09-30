import React, { useState } from 'react';
import { UserCheck, UserX, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AttendantTagProps {
  /** `conversations.assigned_user_id` — an auth.users id. */
  assignedUserId: string | null;
  /** Team members, each carrying its own `user_id` (auth id). */
  teamMembers: { id: string; name: string; user_id?: string | null }[];
  className?: string;
  /** Compact form for the queue list, where space is tight. */
  compact?: boolean;
  /**
   * Makes the tag editable: opens a menu to switch the attendant or remove the
   * assignment. Receives a `team_members.id`, or null to unassign — the same
   * contract as `assignConversation`.
   */
  onChange?: (teamMemberId: string | null) => void;
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
 * Removing the tag therefore means unassigning the conversation.
 *
 * Renders nothing when unassigned: an "unassigned" chip on every unrouted
 * conversation would be noise on the busiest screen in the product.
 */
export const AttendantTag: React.FC<AttendantTagProps> = ({ assignedUserId, teamMembers, className, compact, onChange }) => {
  const [open, setOpen] = useState(false);
  if (!assignedUserId) return null;

  const member = teamMembers.find((m) => m.user_id === assignedUserId);
  // A conversation can outlive the account it was assigned to; naming that is
  // more useful to a supervisor than showing a bare id or nothing at all.
  const name = member?.name ?? 'Atendente removido';
  const firstName = name.split(' ')[0];

  const chipClass = cn(
    'inline-flex items-center gap-1 rounded-full bg-primary-subtle font-medium text-primary-subtle-foreground',
    compact ? 'px-1.5 h-[18px] text-[11px]' : 'px-2 h-5 text-xs',
    className,
  );
  const content = (
    <>
      <UserCheck className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {compact ? firstName : name}
    </>
  );

  if (!onChange) {
    return <span title={`Direcionado para ${name}`} className={chipClass}>{content}</span>;
  }

  const pick = (teamMemberId: string | null) => {
    onChange(teamMemberId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`Direcionado para ${name} — clique para mudar ou remover`}
          className={cn(chipClass, 'hover:brightness-95 dark:hover:brightness-125 transition-[filter] flex-shrink-0')}
        >
          {content}
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1.5">
        <p className="px-3 py-2 text-sm text-primary">
          Mudar atendente
        </p>
        <div className="max-h-60 overflow-y-auto">
          {teamMembers.map((m) => {
            const current = m.user_id === assignedUserId;
            return (
              <button
                key={m.id}
                type="button"
                disabled={current}
                onClick={() => pick(m.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent disabled:opacity-60 disabled:hover:bg-transparent transition-colors text-left"
              >
                <span className="truncate">{m.name}</span>
                {current && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="h-px bg-border my-1" />
        <button
          type="button"
          onClick={() => pick(null)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-accent transition-colors"
        >
          <UserX className="w-3.5 h-3.5" />
          Remover atendente
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default AttendantTag;
