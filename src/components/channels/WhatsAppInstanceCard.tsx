import React, { useState } from 'react';
import { Loader2, QrCode, RefreshCw, Unlink, Trash2, MessageCircle, Download } from 'lucide-react';
import { Button } from '@/components/Button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { WhatsappInstanceSummary } from '@/types';
import { disconnectWhatsappInstance, removeWhatsappInstance, importWhatsappContacts } from '@/services/whatsappConnectionService';
import { EvolutionConnectSheet } from './EvolutionConnectSheet';
import { toast } from 'sonner';

interface WhatsAppInstanceCardProps {
  instance: WhatsappInstanceSummary;
  lastFetchedAt?: Date;
  onChanged: () => void;
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

export const WhatsAppInstanceCard: React.FC<WhatsAppInstanceCardProps> = ({ instance, lastFetchedAt, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const label = instance.profileName || instance.name;

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
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{label}</h3>
            <p className="text-[11px] text-muted-foreground truncate">{formatNumber(instance.number)}</p>
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
        <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)} disabled={busy}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remover
        </Button>
      </div>

      <EvolutionConnectSheet
        open={sheetOpen}
        onOpenChange={(next) => { setSheetOpen(next); if (!next) onChanged(); }}
        existingInstanceName={instance.name}
      />

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
