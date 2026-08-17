import React, { useEffect, useState } from 'react';
import { Instagram, Facebook, Loader2, ShieldCheck, ShieldAlert, Users, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SectionBlock } from '@/components/layout';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { InstanceAccessSheet } from './InstanceAccessSheet';
import { useInstanceAccessGrants } from '@/hooks/useInstanceAccessGrants';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { fetchMetaAccounts, type MetaAccountsResult } from '@/services/metaAccountService';

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

  return (
    <SectionBlock
      title="Instagram e Facebook"
      icon={Instagram}
      description={
        loading
          ? 'Verificando contas configuradas…'
          : accounts.length > 0
            ? `${accounts.length} conta(s) Meta configurada(s)`
            : 'Nenhuma conta Meta configurada'
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Facebook}
          title="Nenhuma conta Meta conectada"
          description="Uma conta é conectada configurando o token de página no backend (META_PAGE_TOKENS) e apontando o webhook da Meta para este servidor. Não há pareamento por QR como no WhatsApp."
          compact
        />
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const granted = grantsByInstance.get(account.id);
            const grantedCount = granted?.size ?? 0;
            return (
              <div key={account.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-foreground break-all">{account.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Página do Facebook / conta do Instagram
                    </p>
                  </div>
                  {canManageUsers && (
                    <Button variant="outline" size="sm" onClick={() => setAccessFor(account.id)}>
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      Acesso ({grantedCount})
                    </Button>
                  )}
                </div>

                {grantedCount === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    Ninguém tem acesso a esta conta ainda — as conversas dela não aparecem para nenhum
                    usuário até alguém receber permissão.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && (
        <div className="mt-4 pt-4 border-t border-border space-y-2.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Configuração do webhook na Meta
          </p>

          {data?.webhookUrl ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-muted px-2 py-1.5 rounded break-all">
                {data.webhookUrl}
              </code>
              <Button variant="ghost" size="sm" onClick={handleCopy} title="Copiar URL do webhook">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Defina <code className="font-mono">PUBLIC_BASE_URL</code> no backend para que a URL de callback
              seja exibida aqui.
            </p>
          )}

          <ul className="space-y-1.5 text-xs">
            <li className="flex items-center gap-1.5">
              {data?.verifyTokenConfigured
                ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                : <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
              <span className={data?.verifyTokenConfigured ? 'text-muted-foreground' : 'text-amber-700'}>
                {data?.verifyTokenConfigured
                  ? 'Token de verificação configurado — a Meta consegue validar o webhook.'
                  : 'Token de verificação ausente (META_WEBHOOK_VERIFY_TOKEN). A Meta não vai validar o webhook.'}
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              {data?.signatureCheckEnabled
                ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                : <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
              <span className={data?.signatureCheckEnabled ? 'text-muted-foreground' : 'text-amber-700'}>
                {data?.signatureCheckEnabled
                  ? 'Assinatura das requisições verificada (X-Hub-Signature-256).'
                  : 'Assinatura não verificada (META_APP_SECRET ausente) — qualquer um com a URL pode enviar eventos.'}
              </span>
            </li>
          </ul>

          {/* A regra da janela de 24h é a causa nº 1 de "mandei e não chegou" no
              Messenger, e o erro que a Graph devolve não deixa isso óbvio. */}
          <p className="text-xs text-muted-foreground">
            A Meta só permite responder até <strong className="text-foreground">24 horas</strong> depois da
            última mensagem do cliente. Passado esse prazo o envio é recusado pela própria Meta — não é
            falha da conexão.
          </p>
        </div>
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
    </SectionBlock>
  );
};
