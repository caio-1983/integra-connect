import React, { useState } from 'react';
import { Loader2, QrCode, RefreshCw, Unlink, Trash2, MessageCircle, Download, ShieldCheck, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { api } from '@/services/api';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { WhatsappInstanceSummary } from '@/types';
import { disconnectWhatsappInstance, removeWhatsappInstance, importWhatsappContacts } from '@/services/whatsappConnectionService';
import { EvolutionConnectSheet } from './EvolutionConnectSheet';
import { InstanceAccessSheet } from './InstanceAccessSheet';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { toast } from 'sonner';

interface WhatsAppInstanceCardProps {
  instance: WhatsappInstanceSummary;
  lastFetchedAt?: Date;
  onChanged: () => void;
  grantedUserIds: Set<string>;
  onGrantsChanged: () => void;
  /** Custom display name for the card (overrides the WhatsApp profile name). */
  customLabel?: string;
  onLabelChanged: () => void;
}

const STATUS_LABEL: Record<WhatsappInstanceSummary['status'], string> = {
  open: 'Conectado',
  connecting: 'Conectando',
  close: 'Desconectado',
};

const STATUS_PILL: Record<WhatsappInstanceSummary['status'], string> = {
  open: 'bg-emerald-50 text-emerald-700',
  connecting: 'bg-amber-50 text-amber-700',
  close: 'bg-red-50 text-red-700',
};

const STATUS_DOT: Record<WhatsappInstanceSummary['status'], string> = {
  open: 'bg-emerald-500',
  connecting: 'bg-amber-500',
  close: 'bg-red-500',
};

function formatRelative(date?: Date): string {
  if (!date) return 'Nunca verificado';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `há ${seconds || 1} segundo${seconds === 1 ? '' : 's'}`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  return `há ${hours} hora${hours === 1 ? '' : 's'}`;
}

function formatNumber(number?: string): string {
  if (!number) return '—';
  // Best-effort BR display grouping (+55 11 98432-1567); any other country
  // code is shown as-is rather than guessing an incorrect grouping.
  const match = number.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
  if (!match) return number;
  return `+55 ${match[1]} ${match[2]}-${match[3]}`;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export const WhatsAppInstanceCard: React.FC<WhatsAppInstanceCardProps> = ({
  instance, lastFetchedAt, onChanged, grantedUserIds, onGrantsChanged, customLabel, onLabelChanged,
}) => {
  const { canManageUsers } = useCompanySettings();
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [accessSheetOpen, setAccessSheetOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const label = customLabel || instance.profileName || instance.name;

  const startEditLabel = () => {
    setLabelDraft(customLabel ?? '');
    setEditingLabel(true);
  };

  const handleSaveLabel = async () => {
    setSavingLabel(true);
    try {
      await api.setInstanceLabel(instance.name, labelDraft);
      toast.success('Nome do card atualizado.');
      setEditingLabel(false);
      onLabelChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao renomear o card.');
    } finally {
      setSavingLabel(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectWhatsappInstance(instance.name);
      toast.success(`${instance.name} desconectado`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao desconectar.');
    } finally {
      setBusy(false);
    }
  };

  const handleImportContacts = async () => {
    setImporting(true);
    try {
      const result = await importWhatsappContacts(instance.name);
      toast.success(`${result.imported} contato${result.imported !== 1 ? 's' : ''} novo${result.imported !== 1 ? 's' : ''}, ${result.updated} atualizado${result.updated !== 1 ? 's' : ''}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao importar contatos.');
    } finally {
      setImporting(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removeWhatsappInstance(instance.name);
      toast.success(`${instance.name} removido`);
      setConfirmRemove(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover instância.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {instance.profilePicture ? (
            <img src={instance.profilePicture} alt={label} className="w-9 h-9 rounded-lg border border-border object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {editingLabel ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLabel();
                    if (e.key === 'Escape') setEditingLabel(false);
                  }}
                  placeholder={instance.profileName || instance.name}
                  disabled={savingLabel}
                  maxLength={60}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring/50"
                />
                <button onClick={handleSaveLabel} disabled={savingLabel} className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 shrink-0" title="Salvar">
                  {savingLabel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditingLabel(false)} disabled={savingLabel} className="p-1 text-muted-foreground hover:text-foreground shrink-0" title="Cancelar">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 group/label">
                  <h3 className="font-semibold text-foreground text-sm truncate">{label}</h3>
                  {canManageUsers && (
                    <button
                      onClick={startEditLabel}
                      className="p-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover/label:opacity-100 transition-opacity shrink-0"
                      title="Renomear card"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{formatNumber(instance.number)}</p>
              </>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium shrink-0 ${STATUS_PILL[instance.status]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[instance.status]}`} />
          {STATUS_LABEL[instance.status]}
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Instância</span>
          <span className="text-foreground font-medium truncate max-w-[60%]">{instance.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Última sincronização</span>
          <span className="text-foreground font-medium">{formatRelative(lastFetchedAt)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
        {instance.connected ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
              <QrCode className="w-3.5 h-3.5 mr-1.5" /> Atualizar QR
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reconectar
            </Button>
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Unlink className="w-3.5 h-3.5 mr-1.5" /> Desconectar</>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportContacts}
              disabled={importing}
              title="Importa os contatos sincronizados pelo WhatsApp — nomes vêm do perfil da pessoa, não da sua agenda do celular."
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 mr-1.5" /> Importar Contatos</>}
            </Button>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={() => setSheetOpen(true)}>
            <QrCode className="w-3.5 h-3.5 mr-1.5" /> Conectar
          </Button>
        )}
        {canManageUsers && (
          <Button variant="outline" size="sm" onClick={() => setAccessSheetOpen(true)}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Acesso
            {grantedUserIds.size > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium">{grantedUserIds.size}</span>
            )}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)} disabled={busy}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remover
        </Button>
      </div>

      <EvolutionConnectSheet
        open={sheetOpen}
        onOpenChange={(next) => { setSheetOpen(next); if (!next) onChanged(); }}
        existingInstanceName={instance.name}
      />

      {canManageUsers && (
        <InstanceAccessSheet
          open={accessSheetOpen}
          onOpenChange={setAccessSheetOpen}
          instanceName={instance.name}
          grantedUserIds={grantedUserIds}
          onChanged={onGrantsChanged}
        />
      )}

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover "{instance.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a instância do servidor Evolution permanentemente. O número precisará escanear um novo QR Code para se conectar de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
