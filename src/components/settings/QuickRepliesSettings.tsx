import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Zap, Plus, Pencil, Trash2, Loader2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';
import { SettingsPanel } from './SettingsPanel';
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

  // WhatsApp's underlined field: hairline at rest, green 2px on focus.
  const fieldLine = 'border-b-2 border-border focus-within:border-primary transition-colors';

  return (
    <SettingsPanel
      title="Respostas rápidas"
      description="Mensagens prontas para as conversas. No chat, digite / ou clique no raio para escolher uma."
      action={!draft && (
        <Button size="sm" onClick={() => openDraft(EMPTY_DRAFT)}>
          <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Nova
        </Button>
      )}
    >
      {draft && (
        <div className="mx-6 my-3 rounded-lg bg-muted px-5 py-4 space-y-5">
          <p className="text-[15px] text-foreground">{draft.id ? 'Editar resposta rápida' : 'Nova resposta rápida'}</p>
          <div>
            <label htmlFor="qr-shortcut" className="text-sm text-primary">Atalho</label>
            <div className={cn('flex items-center', fieldLine)}>
              <span className="text-[15px] text-muted-foreground" aria-hidden="true">/</span>
              <input
                id="qr-shortcut"
                autoFocus
                value={draft.shortcut}
                onChange={(e) => setDraft({ ...draft, shortcut: normalizeShortcut(e.target.value) })}
                placeholder="obrigado"
                maxLength={30}
                className="flex-1 bg-transparent px-1 py-2 text-[15px] text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
              />
              <span className="text-xs text-muted-foreground tabular-nums">{30 - draft.shortcut.length}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Letras minúsculas, números, - e _.</p>
          </div>
          <div>
            <label htmlFor="qr-message" className="text-sm text-primary">Mensagem</label>
            <div className={fieldLine}>
              <textarea
                id="qr-message"
                value={draft.message}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                placeholder="Obrigado pelo contato! Qualquer dúvida, estamos à disposição."
                rows={4}
                className="w-full bg-transparent py-2 text-[15px] text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground resize-y"
              />
            </div>
          </div>
          <div>
            <span className="text-sm text-primary">Imagem (opcional)</span>
            <input
              ref={imageInputRef}
              type="file"
              accept={QUICK_REPLY_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={handleImageChange}
            />
            <div className="mt-2 flex items-center gap-3">
              {imagePreview && (
                <img src={imagePreview} alt="Imagem da resposta" className="w-20 h-20 rounded-lg object-cover" />
              )}
              <div className="flex flex-wrap gap-1">
                <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
                  <ImagePlus className="w-4 h-4 mr-1.5" aria-hidden="true" /> {imagePreview ? 'Trocar' : 'Adicionar imagem'}
                </Button>
                {imagePreview && (
                  <Button variant="ghost" size="sm" onClick={() => setImageFile(null)}>
                    <X className="w-4 h-4 mr-1.5" aria-hidden="true" /> Remover
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG ou WEBP até 5 MB. A mensagem vai como legenda.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => openDraft(null)} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Salvando" /> : 'Salvar'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" aria-label="Carregando respostas rápidas" />
        </div>
      ) : quickReplies.length === 0 ? (
        !draft && (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Zap className="w-9 h-9 text-icon/40" aria-hidden="true" />
            <p className="text-[15px] text-foreground">Nenhuma resposta rápida ainda</p>
            <p className="text-sm text-muted-foreground">Crie a primeira com "Nova". Todo o time pode usar e editar.</p>
          </div>
        )
      ) : (
        <ul className="pb-2">
          {quickReplies.map((reply) => (
            <li key={reply.id} className="group flex items-center gap-4 pl-6 pr-4 hover:bg-accent transition-colors">
              {reply.imageUrl ? (
                <img src={reply.imageUrl} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              ) : (
                <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <Zap className="w-5 h-5 text-icon" />
                </span>
              )}
              <div className="flex-1 min-w-0 py-3 border-b border-border group-last:border-b-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openDraft({ id: reply.id, shortcut: reply.shortcut, message: reply.message, imageUrl: reply.imageUrl })}
                  className="flex-1 min-w-0 text-left rounded-sm focus-visible:ring-offset-0"
                >
                  <span className="block text-[17px] leading-[21px] text-foreground">/{reply.shortcut}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                    {reply.message || 'Só imagem'}
                  </span>
                </button>
                <div className="flex items-center flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openDraft({ id: reply.id, shortcut: reply.shortcut, message: reply.message, imageUrl: reply.imageUrl })}
                    aria-label={`Editar /${reply.shortcut}`}
                    title="Editar"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-icon hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(reply)}
                    aria-label={`Excluir /${reply.shortcut}`}
                    title="Excluir"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-icon hover:bg-danger-subtle hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsPanel>
  );
};
