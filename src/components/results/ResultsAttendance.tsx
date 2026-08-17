import React, { useEffect, useState } from 'react';
import { Headset, Loader2, AlertTriangle } from 'lucide-react';
import { SectionBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { fetchAttendantPerformance, formatDuration, type AttendantRow } from '@/services/analyticsService';
import { useResultsPeriod } from './ResultsLayout';

/**
 * Per-attendant supervision — the "controle de mensagens" the team asked for,
 * which they clarified means supervision and quality rather than volume or cost.
 *
 * Only possible because `messages.sent_by` now records who typed each reply;
 * before that, `from_type = 'human'` made every attendant's work anonymous.
 *
 * Two caveats worth stating in the UI rather than burying:
 *   - "Aguardando resposta" is a LIVE queue count, not period-filtered — a thread
 *     hanging since before the period is exactly the one to chase.
 *   - Numbers only cover WhatsApp numbers the viewer has access to, because the
 *     underlying view honours the per-number grants.
 */
export const ResultsAttendance: React.FC = () => {
  const period = useResultsPeriod();
  const [rows, setRows] = useState<AttendantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAttendantPerformance(period)
      .then((data) => { if (!cancelled) setRows(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const totalAwaiting = rows.reduce((sum, r) => sum + r.awaitingCount, 0);

  return (
    <>
      <SectionBlock
        title="Desempenho por atendente"
        icon={Headset}
        description="Mensagens enviadas e tempo até a primeira resposta humana no período. Só aparecem números dos canais a que você tem acesso."
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Headset}
            title="Nenhuma atividade no período"
            description="Nenhum atendente enviou mensagens neste período. Respostas enviadas antes desta atualização não têm autor registrado e não aparecem aqui."
            compact
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Mensagens, conversas e tempo de resposta por atendente</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th scope="col" className="py-2 pr-4 font-medium">Atendente</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">Mensagens</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">Conversas</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">1ª resposta (média)</th>
                  <th scope="col" className="py-2 font-medium text-right">Aguardando resposta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 text-foreground">{row.name}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{row.messagesSent}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{row.conversationsHandled}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatDuration(row.avgFirstResponseSeconds)}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.awaitingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {row.awaitingCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>

      {!loading && totalAwaiting > 0 && (
        <SectionBlock title="Conversas sem resposta" icon={AlertTriangle}>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{totalAwaiting} conversa(s) atribuída(s)</strong> estão com a
            última mensagem do contato e nenhuma resposta — nem da IA, nem de uma pessoa. Este número é do
            momento atual, não do período selecionado.
          </p>
        </SectionBlock>
      )}
    </>
  );
};

export default ResultsAttendance;
