import React, { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/Button';
import { Loader2, CheckCircle2, QrCode } from 'lucide-react';
import { createWhatsappInstance, fetchWhatsappQr, fetchWhatsappState, reconnectWhatsappInstance } from '@/services/whatsappConnectionService';
import { toast } from 'sonner';

interface EvolutionConnectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, skips the "create new" step and requests a fresh QR for this
   *  already-registered instance instead (Sprint 012 Reconectar/Conectar). */
  existingInstanceName?: string;
}

type Phase = 'idle' | 'creating' | 'awaiting-scan' | 'connected' | 'error';

const POLL_MS = 3000;
// GET /instance/connect (used to fetch the QR) rotates the QR server-side on
// every call — polling it every POLL_MS was invalidating the code while the
// phone was mid-handshake ("não foi possível conectar o dispositivo"). State
// is still checked every POLL_MS (cheap, no side effect); the QR image itself
// only refreshes on this much slower cadence.
const QR_REFRESH_MS = 25000;
const DEFAULT_INSTANCE = 'integra-connect';

/**
 * Fase 2 "na tela": create an Evolution instance via the backend (which
 * auto-registers the webhook), render the returned QR, and poll connection
 * state until `open`. All Evolution specifics live server-side — this only
 * calls our backend.
 */
export const EvolutionConnectSheet: React.FC<EvolutionConnectSheetProps> = ({ open, onOpenChange, existingInstanceName }) => {
  const [instanceName, setInstanceName] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [qrBase64, setQrBase64] = useState<string | undefined>();
  const [pairingCode, setPairingCode] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastQrFetchRef = useRef(0);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    if (!open) {
      stopPolling();
      setPhase('idle'); setQrBase64(undefined); setPairingCode(undefined); setErrorMsg(undefined);
      return stopPolling;
    }
    if (existingInstanceName) handleReconnect();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startPolling = (name: string) => {
    stopPolling();
    lastQrFetchRef.current = Date.now(); // we just got a fresh QR from create/reconnect
    pollRef.current = setInterval(async () => {
      try {
        const { state } = await fetchWhatsappState(name);
        if (state === 'open') {
          stopPolling();
          setPhase('connected');
          toast.success('WhatsApp conectado');
          return;
        }
        const qrIsStale = Date.now() - lastQrFetchRef.current >= QR_REFRESH_MS;
        if ((state === 'connecting' || state === 'close' || state === 'unknown') && qrIsStale) {
          lastQrFetchRef.current = Date.now();
          const qr = await fetchWhatsappQr(name).catch(() => undefined);
          if (qr?.base64) setQrBase64(qr.base64);
          if (qr?.pairingCode) setPairingCode(qr.pairingCode);
        }
      } catch {
        // transient — keep polling
      }
    }, POLL_MS);
  };

  const handleCreate = async () => {
    setPhase('creating'); setErrorMsg(undefined);
    try {
      const result = await createWhatsappInstance(instanceName.trim() || DEFAULT_INSTANCE);
      setQrBase64(result.qr.base64);
      setPairingCode(result.qr.pairingCode);
      setPhase('awaiting-scan');
      startPolling(instanceName.trim() || DEFAULT_INSTANCE);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao criar instância.');
      setPhase('error');
    }
  };

  const handleReconnect = async () => {
    if (!existingInstanceName) return;
    setPhase('creating'); setErrorMsg(undefined);
    try {
      const result = await reconnectWhatsappInstance(existingInstanceName);
      setQrBase64(result.qr);
      setPairingCode(undefined);
      setPhase('awaiting-scan');
      startPolling(existingInstanceName);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao reconectar instância.');
      setPhase('error');
    }
  };

  const retry = existingInstanceName ? handleReconnect : handleCreate;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existingInstanceName ? `Reconectar "${existingInstanceName}"` : 'Conectar WhatsApp'}</SheetTitle>
          <SheetDescription>
            {existingInstanceName
              ? 'Gera um novo QR Code para reconectar esta instância já cadastrada.'
              : 'Conecte um número do WhatsApp à plataforma. Após gerar o QR Code, basta escaneá-lo pelo aplicativo.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {phase === 'idle' && !existingInstanceName && (
            <div className="space-y-4">
              <div className="border-t border-border" />

              <div className="space-y-1.5">
                <label htmlFor="instance-name" className="text-sm font-medium text-foreground block">
                  Nome da conexão
                </label>
                <input
                  id="instance-name"
                  type="text"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Ex.: Comercial"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
                <p className="text-xs text-muted-foreground">
                  Esse nome serve apenas para identificar este canal.
                </p>
              </div>

              <Button variant="primary" size="sm" onClick={handleCreate} className="w-full">
                <QrCode className="w-3.5 h-3.5 mr-1.5" /> Gerar QR Code
              </Button>
            </div>
          )}

          {phase === 'creating' && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {existingInstanceName ? 'Gerando QR Code…' : 'Criando instância…'}
            </div>
          )}

          {phase === 'awaiting-scan' && (
            <div className="flex flex-col items-center gap-3 py-2">
              {qrBase64 ? (
                <img src={qrBase64} alt="QR Code do WhatsApp" className="w-56 h-56 rounded-lg border border-border" />
              ) : (
                <div className="w-56 h-56 rounded-lg border border-border flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e escaneie o código.
              </p>
              {pairingCode && (
                <p className="text-xs text-foreground">Ou use o código de pareamento: <span className="font-mono font-semibold">{pairingCode}</span></p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguardando leitura…
              </div>
            </div>
          )}

          {phase === 'connected' && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">WhatsApp conectado</p>
              <p className="text-xs text-muted-foreground">As mensagens agora chegam ao Workspace em tempo real.</p>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="mt-2">Fechar</Button>
            </div>
          )}

          {phase === 'error' && (
            <div className="space-y-3">
              <p className="text-xs text-red-600 break-words">{errorMsg}</p>
              <Button variant="primary" size="sm" onClick={retry} className="w-full">Tentar novamente</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
