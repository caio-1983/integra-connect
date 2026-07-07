import React from 'react';
import { Copy, KeyRound, X } from 'lucide-react';
import { Button } from './Button';
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
      toast.success('Senha copiada para a área de transferência');
    } catch {
      toast.error('Não foi possível copiar automaticamente. Copie manualmente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            {title}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Compartilhe esta senha temporária com <strong className="text-foreground">{email}</strong> por
            um canal seguro (WhatsApp, telefone). Ela só é exibida uma vez e o usuário será obrigado a
            trocá-la no primeiro login.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background border border-border rounded-lg p-3 text-sm font-mono text-foreground select-all break-all">
              {temporaryPassword}
            </code>
            <Button type="button" variant="outline" onClick={handleCopy} title="Copiar senha">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="pt-2">
            <Button type="button" onClick={onClose} className="w-full">
              Entendi, já copiei
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamAccountPasswordModal;
