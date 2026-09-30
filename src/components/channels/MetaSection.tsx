import React, { useEffect, useState } from 'react';
import { Facebook, Loader2, ShieldCheck, ShieldAlert, Copy, Check, TriangleAlert, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { InstanceAccessSheet } from './InstanceAccessSheet';
import { BackendUnreachable } from './BackendUnreachable';
import { useInstanceAccessGrants } from '@/hooks/useInstanceAccessGrants';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { fetchMetaAccounts, type MetaAccountsResult } from '@/services/metaAccountService';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { cn } from '@/lib/utils';

/**
 * Instagram Direct + Facebook Messenger connections.
 *
 * Deliberately NOT a pairing flow like WhatsApp's: a Meta account is connected by
 * configuring its page access token on the backend and pointing Meta's webhook
 * here. So this section reports what is configured and shows the two values that
 * are most often wrong (callback URL and whether the verify token is set), rather
 * than pretending there is a button that connects an account.
 *
 * The access panel is the same one WhatsApp numbers use — `can_access_conversation`
 * matches grants on `instance_name` regardless of channel, and Meta conversations
 * store the Page/IG account id there. Which means: until someone is granted access
 * to an account, NOBODY sees its conversations. That is stated on screen because
 * it otherwise looks exactly like a broken integration.
 */
export const MetaSection: React.FC = () => {
  const [data, setData] = useState<MetaAccountsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessFor, setAccessFor] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { grantsByInstance, refresh } = useInstanceAccessGrants();
  const { canManageUsers } = useCompanySettings();

  useEffect(() => {
    let cancelled = false;
    fetchMetaAccounts()
      .then((result) => { if (!cancelled) setData(result); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCopy = async () => {
    if (!data?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(data.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.');
    }
  };

  const accounts = data?.accounts ?? [];
  const IgIcon = CHANNEL_CONFIG.instagram.icon;

  const check = (ok: boolean | undefined, good: string, bad: string) => (
    <li className="flex items-start gap-4">
      {ok
        ? <ShieldCheck className="w-5 h-5 mt-px flex-shrink-0 text-success" aria-hidden="true" />
        : <ShieldAlert className="w-5 h-5 mt-px flex-shrink-0 text-warning" aria-hidden="true" />}
      <span className={cn('text-sm', ok ? 'text-muted-foreground' : 'text-foreground')}>{ok ? good : bad}</span>
    </li>
  );

  return (
    <Panel
      title="Instagram e Facebook"
      description={
        loading
          ? 'Verificando contas configuradas…'
          : data?.unreachable
            ? 'Sem resposta do servidor.'
            : accounts.length > 0
            ? `${accounts.length} ${accounts.length === 1 ? 'conta Meta configurada' : 'contas Meta configuradas'}`
            : 'Nenhuma conta Meta configurada.'
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" /> Carregando…
        </div>
      ) : data?.unreachable ? (
        <BackendUnreachable />
      ) : (
        <>
          {accounts.length === 0 ? (
            <div className="flex items-start gap-4 px-6 py-3">
              <span className="w-10 h-10 rounded-full bg-secondary text-icon flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <Facebook className="w-5 h-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                Uma conta entra configurando o token da página no backend (<code className="font-mono text-foreground">META_PAGE_TOKENS</code>)
                e apontando o webhook da Meta para este servidor. Não há pareamento por QR como no WhatsApp.
              </p>
            </div>
          ) : (
            <ul>
              {accounts.map((account) => {
                const grantedCount = grantsByInstance.get(account.id)?.size ?? 0;
                return (
                  <li key={account.id} className="group/li flex items-center gap-4 pl-4 pr-6">
                    <span className="w-[49px] h-[49px] rounded-full bg-secondary text-icon flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <IgIcon className="w-6 h-6" />
                    </span>
                    <div className="flex-1 min-w-0 py-3 border-b border-border group-last/li:border-b-0 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[17px] leading-[21px] text-foreground font-mono break-all">{account.id}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">Página do Facebook / conta do Instagram</p>
                        {grantedCount === 0 && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                            <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            Ninguém tem acesso: as conversas desta conta não aparecem para a equipe.
                          </p>
                        )}
                      </div>
                      {canManageUsers && (
                        <Button variant="outline" size="sm" onClick={() => setAccessFor(account.id)} className="flex-shrink-0">
                          Acesso · {grantedCount}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mx-6 mt-2 mb-5 pt-4 border-t border-border space-y-4">
            <h3 className="text-sm text-primary">Webhook na Meta</h3>

            {data?.webhookUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 font-mono text-xs bg-secondary text-foreground px-3 py-2 rounded-lg break-all">{data.webhookUrl}</code>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copiar URL do webhook"
                  title="Copiar"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-icon hover:bg-accent flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Defina <code className="font-mono text-foreground">PUBLIC_BASE_URL</code> no backend para a URL de callback aparecer aqui.
              </p>
            )}

            <ul className="space-y-3">
              {check(data?.verifyTokenConfigured,
                'Token de verificação configurado: a Meta consegue validar o webhook.',
                'Token de verificação ausente (META_WEBHOOK_VERIFY_TOKEN). A Meta não vai validar o webhook.')}
              {check(data?.signatureCheckEnabled,
                'Assinatura das requisições verificada (X-Hub-Signature-256).',
                'Assinatura não verificada (META_APP_SECRET ausente): qualquer um com a URL pode enviar eventos.')}
              {/* A regra da janela de 24h é a causa nº 1 de "mandei e não chegou" no
                  Messenger, e o erro que a Graph devolve não deixa isso óbvio. */}
              <li className="flex items-start gap-4">
                <Clock className="w-5 h-5 mt-px flex-shrink-0 text-icon" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">
                  A Meta só deixa responder até <strong className="font-medium text-foreground">24 horas</strong> depois da última
                  mensagem do cliente. Depois disso o envio é recusado pela própria Meta; não é falha da conexão.
                </span>
              </li>
            </ul>
          </div>
        </>
      )}

      {accessFor && (
        <InstanceAccessSheet
          open={accessFor !== null}
          onOpenChange={(open) => { if (!open) setAccessFor(null); }}
          instanceName={accessFor}
          grantedUserIds={grantsByInstance.get(accessFor) ?? new Set()}
          onChanged={refresh}
        />
      )}
    </Panel>
  );
};
