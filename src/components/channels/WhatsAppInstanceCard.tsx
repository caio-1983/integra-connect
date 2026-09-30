import React, { useState } from 'react';
import { Loader2, QrCode, Unlink, Trash2, Download, ShieldCheck, Pencil, Check, X, MoreVertical, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/Button';
import { api } from '@/services/api';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WhatsappInstanceSummary } from '@/types';
import { disconnectWhatsappInstance, removeWhatsappInstance, importWhatsappContacts } from '@/services/whatsappConnectionService';
import { EvolutionConnectSheet } from './EvolutionConnectSheet';
import { InstanceAccessSheet } from './InstanceAccessSheet';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import { cn, formatPhone } from '@/lib/utils';
import { toast } from 'sonner';

interface WhatsAppInstanceCardProps {
  instance: WhatsappInstanceSummary;
  onChanged: () => void;
  grantedUserIds: Set<string>;
  onGrantsChanged: () => void;
  /** Custom display name for the row (overrides the WhatsApp profile name). */
  customLabel?: string;
  onLabelChanged: () => void;
}

const STATUS: Record<WhatsappInstanceSummary['status'], { label: string; text: string; dot: string }> = {
  open:       { label: 'Conectado',    text: 'text-success', dot: 'bg-success' },
  connecting: { label: 'Conectando…',  text: 'text-warning', dot: 'bg-warning' },
  close:      { label: 'Desconectado', text: 'text-danger',  dot: 'bg-danger' },
};

/** One connected number, laid out like an entry of WhatsApp's "Aparelhos conectados". */
export const WhatsAppInstanceCard: React.FC<WhatsAppInstanceCardProps> = ({
  instance, onChanged, grantedUserIds, onGrantsChanged, customLabel, onLabelChanged,
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
  const status = STATUS[instance.status];
  const grants = grantedUserIds.size;

  const startEditLabel = () => {
    setLabelDraft(customLabel ?? '');
    setEditingLabel(true);
  };

  const handleSaveLabel = async () => {
    setSavingLabel(true);
    try {
      await api.setInstanceLabel(instance.name, labelDraft);
      toast.success('Nome atualizado.');
      setEditingLabel(false);
      onLabelChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao renomear.');
    } finally {
      setSavingLabel(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectWhatsappInstance(instance.name);
      toast.success(`${label} desconectado`);
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
      toast.success(`${label} removido`);
      setConfirmRemove(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="group/li flex items-center gap-4 pl-4 pr-3">
      <span className="relative flex-shrink-0">
        <ContactAvatar src={instance.profilePicture} name={label} className="w-[49px] h-[49px] text-lg" />
        <span className={cn('absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-card', status.dot)} aria-hidden="true" />
      </span>

      <div className="flex-1 min-w-0 py-3 border-b border-border group-last/li:border-b-0 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {editingLabel ? (
            <div className="flex items-center gap-1 border-b-2 border-primary">
              <input
                autoFocus
                aria-label="Nome do número"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveLabel();
                  if (e.key === 'Escape') setEditingLabel(false);
                }}
                placeholder={instance.profileName || instance.name}
                disabled={savingLabel}
                maxLength={60}
                className="flex-1 min-w-0 bg-transparent py-1 text-[17px] text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
              />
              <button type="button" onClick={handleSaveLabel} disabled={savingLabel} aria-label="Salvar nome" className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-accent disabled:opacity-50">
                {savingLabel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => setEditingLabel(false)} disabled={savingLabel} aria-label="Cancelar" className="w-8 h-8 rounded-full flex items-center justify-center text-icon hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-[17px] leading-[21px] text-foreground truncate" title={`Instância: ${instance.name}`}>{label}</p>
          )}
          <p className="mt-0.5 text-sm text-muted-foreground truncate tabular-nums">
            <span className={status.text}>{status.label}</span>
            {instance.number && <> · {formatPhone(instance.number) || instance.number}</>}
          </p>
          {canManageUsers && (
            <button
              type="button"
              onClick={() => setAccessSheetOpen(true)}
              className={cn(
                'mt-1 inline-flex items-start gap-1 text-left text-xs rounded-sm hover:underline underline-offset-4',
                grants === 0 ? 'text-warning' : 'text-muted-foreground',
              )}
            >
              {grants === 0
                ? <><TriangleAlert className="w-3.5 h-3.5 mt-px flex-shrink-0" aria-hidden="true" /> Ninguém tem acesso: as conversas não aparecem para a equipe</>
                : <><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> {grants} {grants === 1 ? 'pessoa com acesso' : 'pessoas com acesso'}</>}
            </button>
          )}
        </div>

        {!instance.connected && (
          <Button size="sm" onClick={() => setSheetOpen(true)} className="hidden sm:inline-flex flex-shrink-0">
            <QrCode className="w-4 h-4 mr-1.5" aria-hidden="true" /> Conectar
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Ações de ${label}`}
              disabled={busy}
              className="w-10 h-10 rounded-full flex items-center justify-center text-icon hover:bg-accent flex-shrink-0 disabled:opacity-50"
            >
              {busy || importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <MoreVertical className="w-5 h-5" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {!instance.connected && (
              <DropdownMenuItem onSelect={() => setSheetOpen(true)}>
                <QrCode className="w-4 h-4 mr-2" /> Conectar com QR Code
              </DropdownMenuItem>
            )}
            {instance.connected && (
              <>
                <DropdownMenuItem onSelect={() => setSheetOpen(true)}>
                  <QrCode className="w-4 h-4 mr-2" /> Reconectar com novo QR
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleImportContacts}
                  disabled={importing}
                  title="Importa os contatos sincronizados pelo WhatsApp — nomes vêm do perfil da pessoa, não da agenda do celular."
                >
                  <Download className="w-4 h-4 mr-2" /> Importar contatos
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleDisconnect}>
                  <Unlink className="w-4 h-4 mr-2" /> Desconectar
                </DropdownMenuItem>
              </>
            )}
            {canManageUsers && (
              <>
                <DropdownMenuItem onSelect={startEditLabel}>
                  <Pencil className="w-4 h-4 mr-2" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAccessSheetOpen(true)}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Quem tem acesso
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setConfirmRemove(true)} className="text-danger focus:text-danger">
              <Trash2 className="w-4 h-4 mr-2" /> Remover número
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            <AlertDialogTitle>Remover "{label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O número sai do servidor Evolution de vez. Para voltar, será preciso escanear um novo QR Code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={busy} className="bg-danger text-white hover:bg-danger/90">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
};
