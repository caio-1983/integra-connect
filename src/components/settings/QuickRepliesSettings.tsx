import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Zap, Plus, Pencil, Trash2, Loader2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { SectionBlock } from '@/components/layout';
import { Button } from '@/components/Button';
import {
  normalizeShortcut, useQuickReplies, type QuickReply,
  QUICK_REPLY_IMAGE_TYPES, QUICK_REPLY_IMAGE_MAX_BYTES,
} from '@/hooks/useQuickReplies';

interface Draft { id?: string; shortcut: string; message: string; imageUrl?: string | null }

const EMPTY_DRAFT: Draft = { shortcut: '', message: '' };

/**
 * Respostas rápidas da empresa (como no WhatsApp Business). Todo mundo vê a
 * lista, cadastra, edita e apaga qualquer uma, sem restrição de papel ou autor.
 */
export const QuickRepliesSettings: React.FC = () => {
  const { quickReplies, loading, save, remove } = useQuickReplies();
  const [draft, setDraft] = useState<Draft | null>(null);
  // undefined = keep the draft's current image, null = remove it, File = replace it.
  const [imageFile, setImageFile] = useState<File | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const newImagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => () => { if (newImagePreview) URL.revokeObjectURL(newImagePreview); }, [newImagePreview]);
  const imagePreview = imageFile === undefined ? draft?.imageUrl ?? null : newImagePreview;

  const openDraft = (next: Draft | null) => {
    setDraft(next);
    setImageFile(undefined);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!QUICK_REPLY_IMAGE_TYPES.includes(file.type)) { toast.error('Use uma imagem JPG, PNG ou WEBP.'); return; }
    if (file.size > QUICK_REPLY_IMAGE_MAX_BYTES) { toast.error('Imagem muito grande (máx. 5 MB).'); return; }
    setImageFile(file);
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!normalizeShortcut(draft.shortcut)) { toast.error('Informe um atalho.'); return; }
    if (!draft.message.trim() && !imagePreview) { toast.error('Informe a mensagem ou uma imagem.'); return; }
    setSaving(true);
    try {
      await save(draft, imageFile);
      toast.success(draft.id ? 'Resposta rápida atualizada.' : 'Resposta rápida criada.');
      openDraft(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (reply: QuickReply) => {
    if (!confirm(`Excluir a resposta rápida /${reply.shortcut}?`)) return;
    try {
      await remove(reply);
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
          <Button size="sm" onClick={() => openDraft(EMPTY_DRAFT)}>
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
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagem (opcional)</label>
              <input
                ref={imageInputRef}
                type="file"
                accept={QUICK_REPLY_IMAGE_TYPES.join(',')}
                className="hidden"
                onChange={handleImageChange}
              />
              {imagePreview ? (
                <div className="flex items-start gap-3">
                  <img src={imagePreview} alt="" className="w-24 h-24 rounded-lg object-cover border border-border" />
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()}>
                      <ImagePlus className="w-4 h-4 mr-1.5" /> Trocar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setImageFile(null)}>
                      <X className="w-4 h-4 mr-1.5" /> Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()}>
                  <ImagePlus className="w-4 h-4 mr-1.5" /> Adicionar imagem
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">JPG, PNG ou WEBP até 5 MB. A mensagem vai como legenda.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => openDraft(null)} disabled={saving}>Cancelar</Button>
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
                {reply.imageUrl && (
                  <img src={reply.imageUrl} alt="" className="w-10 h-10 rounded-md object-cover border border-border flex-shrink-0" />
                )}
                <p className="flex-1 min-w-0 text-sm text-foreground whitespace-pre-wrap line-clamp-3">{reply.message}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openDraft({ id: reply.id, shortcut: reply.shortcut, message: reply.message, imageUrl: reply.imageUrl })}
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
