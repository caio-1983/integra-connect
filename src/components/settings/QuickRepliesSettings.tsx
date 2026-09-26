import React, { useState } from 'react';
import { Zap, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SectionBlock } from '@/components/layout';
import { Button } from '@/components/Button';
import { normalizeShortcut, useQuickReplies, type QuickReply } from '@/hooks/useQuickReplies';

interface Draft { id?: string; shortcut: string; message: string }

const EMPTY_DRAFT: Draft = { shortcut: '', message: '' };

/**
 * Respostas rápidas da empresa (como no WhatsApp Business). Todo mundo vê a
 * lista, cadastra, edita e apaga qualquer uma, sem restrição de papel ou autor.
 */
export const QuickRepliesSettings: React.FC = () => {
  const { quickReplies, loading, save, remove } = useQuickReplies();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!draft) return;
    if (!normalizeShortcut(draft.shortcut)) { toast.error('Informe um atalho.'); return; }
    if (!draft.message.trim()) { toast.error('Informe a mensagem.'); return; }
    setSaving(true);
    try {
      await save(draft);
      toast.success(draft.id ? 'Resposta rápida atualizada.' : 'Resposta rápida criada.');
      setDraft(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (reply: QuickReply) => {
    if (!confirm(`Excluir a resposta rápida /${reply.shortcut}?`)) return;
    try {
      await remove(reply.id);
      toast.success('Resposta rápida excluída.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  };

  return (
    <SectionBlock
      title="Respostas rápidas"
      icon={Zap}
      description="Mensagens prontas para usar nas conversas. No chat, digite / ou clique no raio para escolher uma."
    >
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {!draft && (
          <Button size="sm" onClick={() => setDraft(EMPTY_DRAFT)}>
            <Plus className="w-4 h-4 mr-1.5" /> Nova resposta rápida
          </Button>
        )}

        {draft && (
          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Atalho</label>
              <div className="flex items-center rounded-lg border border-border bg-card focus-within:ring-1 focus-within:ring-ring/50">
                <span className="pl-3 text-sm text-muted-foreground">/</span>
                <input
                  autoFocus
                  value={draft.shortcut}
                  onChange={(e) => setDraft({ ...draft, shortcut: normalizeShortcut(e.target.value) })}
                  placeholder="obrigado"
                  maxLength={30}
                  className="flex-1 bg-transparent px-1 py-2 text-sm text-foreground outline-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Letras minúsculas, números, - e _.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mensagem</label>
              <textarea
                value={draft.message}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                placeholder="Obrigado pelo contato! Qualquer dúvida, estamos à disposição."
                rows={4}
                className="w-full rounded-lg border border-border bg-card p-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring/50 resize-y"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={saving}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : quickReplies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma resposta rápida cadastrada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {quickReplies.map((reply) => (
              <li key={reply.id} className="flex items-start gap-3 py-3">
                <span className="text-sm font-semibold text-primary font-mono flex-shrink-0">/{reply.shortcut}</span>
                <p className="flex-1 min-w-0 text-sm text-foreground whitespace-pre-wrap line-clamp-3">{reply.message}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setDraft({ id: reply.id, shortcut: reply.shortcut, message: reply.message })}
                    title="Editar"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(reply)}
                    title="Excluir"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionBlock>
  );
};
