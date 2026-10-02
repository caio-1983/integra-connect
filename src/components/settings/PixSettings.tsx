import React, { useState } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { usePixSettings } from '@/hooks/usePixSettings';
import {
  PIX_KEY_TYPES, formatPixKey, normalizePixKey, pixKeyTypeLabel, validatePixKey, type PixKeyType,
} from '@/lib/pix';
import { PixBubblePreview, PixMark } from '@/components/workspace/PixCard';
import { SettingsPanel } from './SettingsPanel';

interface Draft { merchantName: string; keyType: PixKeyType; key: string }

/**
 * Chave Pix da empresa: o que o "+ → Chave Pix" do chat envia ao cliente.
 * Todo mundo vê; só admin e gestor cadastram ou alteram (RLS de pix_settings).
 */
export const PixSettings: React.FC = () => {
  const { pixSettings, loading, save } = usePixSettings();
  const { canManageUsers: canEdit } = useCompanySettings();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const openDraft = () => setDraft(
    pixSettings
      ? { merchantName: pixSettings.merchantName, keyType: pixSettings.keyType, key: formatPixKey(pixSettings.keyType, pixSettings.key) }
      : { merchantName: '', keyType: 'cnpj', key: '' },
  );

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await save(draft);
      toast.success('Chave Pix salva.');
      setDraft(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  // What the preview shows while editing: the draft as it would be stored.
  const draftKey = draft ? normalizePixKey(draft.keyType, draft.key) : '';
  const draftError = draft && draft.key.trim() ? validatePixKey(draft.keyType, draftKey) : null;
  const previewSource = draft
    ? { merchantName: draft.merchantName.trim() || 'Razão social', keyType: draft.keyType, key: draftKey || '—' }
    : pixSettings;

  // WhatsApp's underlined field: hairline at rest, green 2px on focus.
  const fieldLine = 'border-b-2 border-border focus-within:border-primary transition-colors';
  const fieldInput = 'w-full bg-transparent py-2 text-[15px] text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground';

  return (
    <SettingsPanel
      title="Chave Pix"
      description='No chat, use o "+" → Chave Pix: o cliente recebe o cartão Pix do WhatsApp e copia a chave com um toque.'
      action={canEdit && !draft && !loading && (
        <Button size="sm" variant={pixSettings ? 'outline' : 'primary'} onClick={openDraft}>
          {pixSettings
            ? <><Pencil className="w-4 h-4 mr-1.5" aria-hidden="true" /> Alterar</>
            : <><Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Cadastrar</>}
        </Button>
      )}
    >
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" aria-label="Carregando chave Pix" />
        </div>
      ) : !draft && !pixSettings ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <PixMark className="w-9 h-9 text-icon/40" />
          <p className="text-[15px] text-foreground">Nenhuma chave Pix cadastrada</p>
          <p className="text-sm text-muted-foreground">
            {canEdit ? 'Cadastre a chave para o time poder enviar pelo chat.' : 'Peça a um admin ou gestor para cadastrar.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 px-6 pt-3 pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          {draft ? (
            <div className="rounded-lg bg-muted px-5 py-4 space-y-5">
              <div>
                <label htmlFor="pix-merchant" className="text-sm text-primary">Razão social</label>
                <div className={fieldLine}>
                  <input
                    id="pix-merchant"
                    autoFocus
                    value={draft.merchantName}
                    onChange={(e) => setDraft({ ...draft, merchantName: e.target.value })}
                    placeholder="Lumina Comércio de Iluminação LTDA"
                    maxLength={100}
                    className={fieldInput}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Como aparece no banco de quem paga.</p>
              </div>
              <div>
                <span id="pix-type-label" className="text-sm text-primary">Tipo de chave</span>
                <div role="radiogroup" aria-labelledby="pix-type-label" className="mt-2 flex flex-wrap gap-1.5">
                  {PIX_KEY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      role="radio"
                      aria-checked={draft.keyType === type.value}
                      onClick={() => setDraft({ ...draft, keyType: type.value, key: '' })}
                      className={cn(
                        'px-3 h-8 rounded-full border text-sm transition-colors',
                        draft.keyType === type.value
                          ? 'border-primary bg-primary-subtle text-primary'
                          : 'border-border text-muted-foreground hover:bg-accent',
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="pix-key" className="text-sm text-primary">Chave</label>
                <div className={cn(fieldLine, draftError && 'border-danger focus-within:border-danger')}>
                  <input
                    id="pix-key"
                    value={draft.key}
                    onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                    placeholder={PIX_KEY_TYPES.find((t) => t.value === draft.keyType)?.placeholder}
                    inputMode={draft.keyType === 'cnpj' || draft.keyType === 'cpf' || draft.keyType === 'phone' ? 'numeric' : undefined}
                    aria-invalid={!!draftError}
                    aria-describedby="pix-key-hint"
                    className={fieldInput}
                  />
                </div>
                <p id="pix-key-hint" className={cn('mt-1.5 text-xs', draftError ? 'text-danger' : 'text-muted-foreground')}>
                  {draftError ?? 'É o que o botão "Copiar chave Pix" copia para o cliente.'}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={saving}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-20">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Salvando" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : pixSettings && (
            <dl className="divide-y divide-border">
              {[
                ['Razão social', pixSettings.merchantName],
                ['Tipo de chave', pixKeyTypeLabel(pixSettings.keyType)],
                ['Chave', formatPixKey(pixSettings.keyType, pixSettings.key)],
              ].map(([label, value]) => (
                <div key={label} className="py-3 first:pt-0">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-[17px] leading-[21px] text-foreground break-words">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {previewSource && (
            <div className="md:w-[340px]">
              <p className="mb-2 text-sm text-muted-foreground">Como o cliente recebe</p>
              <PixBubblePreview pix={previewSource} />
              <p className="mt-2 text-xs text-muted-foreground">É o cartão Pix do próprio WhatsApp: o ícone é fixo e não leva logo nem o nome de quem envia.</p>
            </div>
          )}
        </div>
      )}
    </SettingsPanel>
  );
};
