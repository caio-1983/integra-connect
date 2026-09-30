import React, { useEffect, useState } from 'react';
import { Headset, TriangleAlert } from 'lucide-react';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import { fetchAttendantPerformance, formatDuration, type AttendantRow } from '@/services/analyticsService';
import { cn } from '@/lib/utils';
import { useResultsPeriod } from './ResultsLayout';
import { ReportEmpty, ReportError, ReportLoading, ReportNotice, td, th, tableWrap } from './ResultsUi';

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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchAttendantPerformance(period)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch(() => { if (!cancelled) { setRows([]); setFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const totalAwaiting = rows.reduce((sum, r) => sum + r.awaitingCount, 0);

  return (
    <>
      <Panel
        title="Desempenho por atendente"
        description="Mensagens enviadas e tempo até a primeira resposta humana. Só entram os números a que você tem acesso."
      >
        {loading ? (
          <ReportLoading />
        ) : failed ? (
          <ReportError />
        ) : rows.length === 0 ? (
          <ReportEmpty
            icon={Headset}
            title="Nenhuma atividade no período"
            text="Nenhum atendente enviou mensagens neste período. Respostas anteriores ao registro de autor não aparecem aqui."
          />
        ) : (
          <div className={tableWrap}>
            <table className="w-full">
              <caption className="sr-only">Mensagens, conversas e tempo de resposta por atendente</caption>
              <thead>
                <tr className="text-left border-b border-border">
                  <th scope="col" className={th}>Atendente</th>
                  <th scope="col" className={cn(th, 'text-right')}>Mensagens</th>
                  <th scope="col" className={cn(th, 'text-right')}>Conversas</th>
                  <th scope="col" className={cn(th, 'text-right')}>1ª resposta (média)</th>
                  <th scope="col" className={cn(th, 'text-right pr-0')}>Aguardando resposta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-b border-border last:border-0">
                    <td className={td}>
                      <span className="flex items-center gap-3">
                        <ContactAvatar name={row.name} className="w-8 h-8 text-xs flex-shrink-0" />
                        <span className="text-foreground">{row.name}</span>
                      </span>
                    </td>
                    <td className={cn(td, 'text-right')}>{row.messagesSent}</td>
                    <td className={cn(td, 'text-right')}>{row.conversationsHandled}</td>
                    <td className={cn(td, 'text-right')}>{formatDuration(row.avgFirstResponseSeconds)}</td>
                    <td className={cn(td, 'text-right pr-0')}>
                      {row.awaitingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-warning font-medium">
                          <TriangleAlert className="w-4 h-4" aria-hidden="true" />
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
      </Panel>

      {!loading && !failed && totalAwaiting > 0 && (
        <ReportNotice>
          <strong className="font-medium text-foreground">
            {totalAwaiting} {totalAwaiting === 1 ? 'conversa atribuída está' : 'conversas atribuídas estão'}
          </strong>{' '}
          com a última mensagem do contato e nenhuma resposta, nem da IA nem de uma pessoa. Este número é de agora,
          não do período selecionado.
        </ReportNotice>
      )}
    </>
  );
};

export default ResultsAttendance;
