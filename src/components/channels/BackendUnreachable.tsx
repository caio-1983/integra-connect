import React from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/Button';

/**
 * The backend didn't answer. Shown instead of an empty list, because "nenhum
 * número conectado" would be a false statement — we simply don't know.
 */
export const BackendUnreachable: React.FC<{ detail?: string | null; onRetry?: () => void }> = ({ detail, onRetry }) => {
  let host = '';
  try {
    host = new URL((import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_AI_GATEWAY_URL) as string).host;
  } catch { /* not configured */ }

  return (
    <div className="flex items-start gap-4 px-6 pt-2 pb-5">
      <span className="w-10 h-10 rounded-full bg-danger-subtle text-danger flex items-center justify-center flex-shrink-0" aria-hidden="true">
        <CloudOff className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-foreground">Não foi possível falar com o servidor</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {host
            ? <>O backend em <code className="font-mono text-foreground">{host}</code> não respondeu. As conexões existentes não foram afetadas; só não dá para listá-las agora.</>
            : <>O endereço do backend (<code className="font-mono text-foreground">VITE_BACKEND_URL</code>) não está configurado.</>}
        </p>
        {detail && <p className="mt-1 text-xs text-muted-foreground font-mono break-all">{detail}</p>}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
            <RefreshCw className="w-4 h-4 mr-1.5" aria-hidden="true" /> Tentar de novo
          </Button>
        )}
      </div>
    </div>
  );
};
