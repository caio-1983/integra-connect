import React from 'react';
import { Copy } from 'lucide-react';
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
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      toast.success('Senha copiada');
    } catch {
      toast.error('Não foi possível copiar automaticamente. Selecione a senha e copie.');
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* The password is shown only once: a stray click outside must not lose it. */}
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <div className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-normal text-foreground">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Mande esta senha temporária para <strong className="font-medium text-foreground">{email}</strong> por
            um canal seguro, como WhatsApp ou telefone. Ela só aparece agora, e a pessoa vai trocá-la no primeiro login.
          </DialogDescription>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 rounded-lg bg-secondary pl-4 pr-1.5 py-1.5">
            <code className="flex-1 min-w-0 text-[17px] font-mono text-foreground select-all break-all">{temporaryPassword}</code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar senha"
              className="w-10 h-10 rounded-full flex items-center justify-center text-icon hover:bg-accent flex-shrink-0"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-6 py-4 flex justify-end border-t border-border">
          <Button type="button" onClick={onClose}>Já copiei</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamAccountPasswordModal;
