import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Zap, Plus, Pencil, Trash2, Loader2, ImagePlus, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';
import { formatWhatsApp } from '@/components/workspace/ConversationTimeline';
import { SettingsPanel } from './SettingsPanel';
import {
  normalizeShortcut, useQuickReplies, type QuickReply,
  QUICK_REPLY_IMAGE_TYPES, QUICK_REPLY_IMAGE_MAX_BYTES,
} from '@/hooks/useQuickReplies';

interface Draft { id?: string; shortcut: string; message: string; imageUrl?: string | null }

const EMPTY_DRAFT: Draft = { shortcut: '', message: '' };

/** Above this many replies the list gets a search field. */
const SEARCH_THRESHOLD = 6;

/** Keeps line breaks and WhatsApp's *bold* / _italic_ / ~strike~ / `mono`. */
const formatted = (text: string) =>
  text.split('\n').map((line, i) => (
    <React.Fragment key={i}>{i > 0 && <br />}{formatWhatsApp(line, i)}</React.Fragment>
  ));

/**
 * The reply as the customer receives it: an outgoing bubble on the chat wall,
 * image on top with the message as its caption.
 */
const ReplyBubble: React.FC<{ message: string; imageUrl: string | null; clamp?: boolean }> = ({ message, imageUrl, clamp }) => (
  <div className="relative ml-auto w-fit max-w-[92%] rounded-lg rounded-tr-none wa-tail-out bg-[var(--wa-out)] p-1 shadow-wa-bubble text-[14.2px] leading-[19px] text-[var(--wa-text)]">
    {imageUrl && <img src={imageUrl} alt="" className="block max-h-40 w-full min-w-[160px] rounded-md object-cover" />}
    {message ? (
      <p className={cn('px-1.5 pt-1 pb-0.5 whitespace-pre-wrap break-words', clamp && 'line-clamp-4')}>{formatted(message)}</p>
    ) : (
      !imageUrl && <p className="px-1.5 pt-1 pb-0.5 italic text-[var(--wa-meta)]">A mensagem aparece aqui</p>
    )}
  </div>
);

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
  const [query, setQuery] = useState('');
  // Delete asks inline on the card (the app's dialogs never use window.confirm here).
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const newImagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => () => { if (newImagePreview) URL.revokeObjectURL(newImagePreview); }, [newImagePreview]);
  const imagePreview = imageFile === undefined ? draft?.imageUrl ?? null : newImagePreview;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\//, '');
    if (!q) return quickReplies;
    return quickReplies.filter((r) => r.shortcut.includes(q) || r.message.toLowerCase().includes(q));
  }, [quickReplies, query]);

  const openDraft = (next: Draft | null) => {
    setDraft(next);
    setImageFile(undefined);
    setConfirmingId(null);
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
    try {
      await remove(reply);
      toast.success('Resposta rápida excluída.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir.');
    } finally {
      setConfirmingId(null);
    }
  };

  // WhatsApp's underlined field: hairline at rest, brand-colored 2px on focus.
  const fieldLine = 'border-b-2 border-border focus-within:border-primary transition-colors';
  const iconButton = 'w-8 h-8 rounded-full flex items-center justify-center text-icon transition-colors';

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
        <div className="mx-6 my-3 grid overflow-hidden rounded-lg border border-border md:grid-cols-[1fr_minmax(0,300px)]">
          <div className="space-y-5 bg-muted px-5 py-4">
            <p className="text-[15px] text-foreground">{draft.id ? `Editar /${draft.shortcut}` : 'Nova resposta rápida'}</p>
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
                  rows={5}
                  className="w-full bg-transparent py-2 text-[15px] text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground resize-y"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">*negrito*, _itálico_ e ~riscado~ funcionam como no WhatsApp.</p>
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
              <div className="mt-2 flex flex-wrap gap-1">
                <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
                  <ImagePlus className="w-4 h-4 mr-1.5" aria-hidden="true" /> {imagePreview ? 'Trocar imagem' : 'Adicionar imagem'}
                </Button>
                {imagePreview && (
                  <Button variant="ghost" size="sm" onClick={() => setImageFile(null)}>
                    <X className="w-4 h-4 mr-1.5" aria-hidden="true" /> Remover
                  </Button>
                )}
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
          <div className="chat-wall flex flex-col border-t border-border md:border-l md:border-t-0">
            <p className="relative px-4 pt-3 text-xs text-[var(--wa-meta)]">Como o cliente recebe</p>
            <div className="relative flex flex-1 items-start px-5 py-4">
              <ReplyBubble message={draft.message.trim()} imageUrl={imagePreview} />
            </div>
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
        <div className="px-6 pb-6 pt-2 space-y-3">
          {quickReplies.length > SEARCH_THRESHOLD && (
            <div className="flex items-center gap-3">
              <label className="flex h-9 flex-1 items-center gap-2 rounded-lg bg-secondary px-3">
                <Search className="h-4 w-4 flex-shrink-0 text-icon" aria-hidden="true" />
                <span className="sr-only">Buscar resposta rápida</span>
                <input
                  id="qr-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por atalho ou texto"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                />
              </label>
              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                {visible.length} de {quickReplies.length}
              </span>
            </div>
          )}
          {visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma resposta com "{query}".</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((reply) => {
                const editing = draft?.id === reply.id;
                const confirming = confirmingId === reply.id;
                return (
                  <li
                    key={reply.id}
                    className={cn(
                      'group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors',
                      editing ? 'border-primary' : 'border-border hover:border-input',
                    )}
                  >
                    <div className="flex items-center gap-1 py-1.5 pl-3 pr-1.5">
                      <button
                        type="button"
                        onClick={() => openDraft({ id: reply.id, shortcut: reply.shortcut, message: reply.message, imageUrl: reply.imageUrl })}
                        className="min-w-0 flex-1 truncate text-left text-[15px] font-medium text-primary rounded-sm focus-visible:ring-offset-0"
                        title={`Editar /${reply.shortcut}`}
                      >
                        /{reply.shortcut}
                      </button>
                      {confirming ? (
                        <span className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Excluir?</span>
                          <button type="button" onClick={() => handleRemove(reply)} className="h-7 rounded-full px-2.5 text-xs font-medium text-danger hover:bg-danger-subtle">Excluir</button>
                          <button type="button" onClick={() => setConfirmingId(null)} className="h-7 rounded-full px-2.5 text-xs text-muted-foreground hover:bg-secondary">Manter</button>
                        </span>
                      ) : (
                        <span className="flex items-center sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openDraft({ id: reply.id, shortcut: reply.shortcut, message: reply.message, imageUrl: reply.imageUrl })}
                            aria-label={`Editar /${reply.shortcut}`}
                            title="Editar"
                            className={cn(iconButton, 'hover:bg-secondary hover:text-foreground')}
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(reply.id)}
                            aria-label={`Excluir /${reply.shortcut}`}
                            title="Excluir"
                            className={cn(iconButton, 'hover:bg-danger-subtle hover:text-danger')}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="chat-wall flex-1 border-t border-border">
                      <div className="relative px-4 py-3">
                        <ReplyBubble message={reply.message} imageUrl={reply.imageUrl} clamp />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </SettingsPanel>
  );
};
