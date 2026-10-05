import React, { useState } from 'react';
import { Check, ClipboardCopy, Copy } from 'lucide-react';
import { Button } from './Button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface TeamAccountPasswordModalProps {
  title: string;
  email: string;
  temporaryPassword: string;
  onClose: () => void;
}

const TeamAccountPasswordModal: React.FC<TeamAccountPasswordModalProps> = ({
  title,
  email,
  temporaryPassword,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedInfo, setCopiedInfo] = useState(false);
  const systemUrl = `${window.location.origin}/`;

  const copy = async (text: string, onDone: (v: boolean) => void, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onDone(true);
      toast.success(okMsg);
      setTimeout(() => onDone(false), 2000);
    } catch {
      toast.error('Não foi possível copiar automaticamente. Selecione o texto e copie.');
    }
  };

  const handleCopyInfo = () =>
    copy(
      [
        '🔐 *Acesso ao Integra Connect*',
        '',
        `Link: ${systemUrl}`,
        `Usuário: ${email}`,
        `Senha: ${temporaryPassword}`,
      ].join('\n'),
      setCopiedInfo,
      'Informações copiadas',
    );

  const rows: Array<[string, React.ReactNode]> = [
    ['Link', <span className="truncate text-sm font-medium text-foreground">{systemUrl}</span>],
    ['Email', <span className="truncate text-sm font-medium text-foreground">{email}</span>],
    [
      'Senha',
      <div className="flex items-center gap-2 min-w-0">
        <code className="text-sm font-mono font-medium tracking-wide text-foreground select-all break-all">{temporaryPassword}</code>
        <button
          type="button"
          onClick={() => copy(temporaryPassword, setCopied, 'Senha copiada')}
          aria-label="Copiar senha"
          title="Copiar senha"
          className="w-8 h-8 rounded-full flex items-center justify-center text-icon hover:bg-accent flex-shrink-0"
        >
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>,
    ],
  ];

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* The password is shown only once: a stray click outside must not lose it. */}
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <div className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-normal text-foreground">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Envie o acesso abaixo para <strong className="font-medium text-foreground">{email}</strong>. No
            primeiro login, será pedido que a pessoa crie uma nova senha.
          </DialogDescription>
        </div>
        <div className="px-6 py-4">
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-secondary">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
                {value}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            Esta senha não será exibida novamente. Copie-a agora.
          </p>
          <button
            type="button"
            onClick={handleCopyInfo}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-3 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            {copiedInfo ? (
              <><Check className="w-4 h-4 text-primary" /> Informações copiadas</>
            ) : (
              <><ClipboardCopy className="w-4 h-4" /> Copiar informações para enviar</>
            )}
          </button>
        </div>
        <div className="px-6 py-4 flex justify-end border-t border-border">
          <Button type="button" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamAccountPasswordModal;
