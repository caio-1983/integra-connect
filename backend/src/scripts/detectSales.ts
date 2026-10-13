/**
 * One-off: Lu reads each campaign lead's conversation and decides whether the
 * sale closed. Sales close in the chat and nobody moves the card, so the
 * campaigns scoreboard undercounts wins.
 *
 * Every verdict is saved in `deal_sale_detections`. Without --dry-run, a
 * "sold" verdict at or above --min-confidence moves the (still open) deal to
 * Ganho and stamps `applied_at` — the "marcado pela Lu" seal.
 *
 * A second run reuses saved verdicts instead of calling OpenAI again, so the
 * usual flow is: --dry-run → review → same command without --dry-run.
 *
 *   npx tsx src/scripts/detectSales.ts --dry-run --limit 10
 *   npx tsx src/scripts/detectSales.ts --dry-run
 *   npx tsx src/scripts/detectSales.ts
 *   In the container: node dist/scripts/detectSales.js [flags]
 *
 * Flags: --since YYYY-MM-DD (2026-10-01)  --until YYYY-MM-DD (2026-11-01)
 *        --min-confidence N (85)  --limit N  --reclassify (ignore saved verdicts)
 *
 * It only calls the model directly — it never goes through the reply pipeline,
 * so no message is ever sent to a customer.
 */
import 'dotenv/config';
import { callModel } from '../runtime/ModelGateway.js';
import { resolveModelForAgent } from '../models/agentModelMap.js';
import {
  saleDetectionRepository,
  type CampaignLeadDeal,
  type SaleDetection,
  type SaleVerdict,
  type TranscriptLine,
} from '../persistence/SaleDetectionRepository.js';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = args.includes('--dry-run');
const reclassify = args.includes('--reclassify');
const since = flag('--since') ?? '2026-10-01';
const until = flag('--until') ?? '2026-11-01';
const minConfidence = Number(flag('--min-confidence') ?? 85);
const limit = flag('--limit') ? Number(flag('--limit')) : undefined;

const CONCURRENCY = 3;
const MAX_CHARS_PER_MESSAGE = 1000;
// gpt-4.1-mini list price, US$ per 1M tokens — only for the cost line at the end.
const PRICE_IN = 0.4;
const PRICE_OUT = 1.6;

const SPEAKER: Record<TranscriptLine['fromType'], string> = { user: 'Cliente', nina: 'Lu (IA)', human: 'Atendente' };

const SYSTEM_PROMPT = [
  'Você analisa conversas de WhatsApp da Lumina, loja de iluminação LED, com clientes que chegaram por anúncio.',
  'Sua única tarefa: dizer se a VENDA FECHOU nesta conversa. Não responda o cliente.',
  '',
  'Conta como venda fechada (sold):',
  '- pagamento confirmado pela loja ou pelo cliente ("pago", "fiz o pix", "segue o comprovante", "pagamento confirmado");',
  '- cliente envia imagem/documento logo depois de receber chave Pix ou link de pagamento, e a loja agradece ou confirma;',
  '- pedido fechado e encaminhado: "pode separar", "pode emitir a nota", envio de código de rastreio, combinação de entrega/retirada de um pedido já pago ou fechado.',
  '',
  'NÃO conta (not_sold):',
  '- só orçamento, preço ou catálogo enviado; cliente sumiu, disse "vou ver", "vou pensar", achou caro, desistiu;',
  '- loja enviou chave Pix/link mas não há sinal de pagamento;',
  '- conversa que não é de compra (fornecedor, suporte de pedido antigo, engano).',
  '',
  'Use unclear quando há forte indício mas nenhuma confirmação (ex.: "vou passar na loja pra pegar", "fechado, amanhã pago") ou a conversa é ambígua.',
  'Nunca invente: baseie-se só no texto. Mensagens "📷 Imagem" ou "📄 Documento" sem legenda podem ser comprovante — considere o contexto ao redor.',
  '',
  'Responda SOMENTE com um JSON válido, sem texto fora dele:',
  '{"verdict": "sold" | "not_sold" | "unclear", "confidence": 0-100, "evidence": string, "value": number | null}',
  '- confidence: sua certeza no veredito.',
  '- evidence: até 2 trechos LITERAIS da conversa que sustentam o veredito, com quem disse (ex.: "Cliente: segue o comprovante | Atendente: pagamento confirmado").',
  '- value: valor total pago/fechado em reais, só se aparecer explícito na conversa; senão null.',
].join('\n');

const formatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

function buildTranscript(lines: TranscriptLine[]): string {
  return lines
    .map((l) => {
      const text = l.text.length > MAX_CHARS_PER_MESSAGE ? `${l.text.slice(0, MAX_CHARS_PER_MESSAGE)}…` : l.text;
      return `[${formatter.format(new Date(l.sentAt))}] ${SPEAKER[l.fromType] ?? 'Desconhecido'}: ${text}`;
    })
    .join('\n');
}

/** Same tolerance as the summary service: keep only the outermost JSON object. */
function extractJson(raw: string): Record<string, unknown> {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in model reply');
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

function asVerdict(v: unknown): SaleVerdict {
  return v === 'sold' || v === 'not_sold' || v === 'unclear' ? v : 'unclear';
}

function asValue(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

const modelId = resolveModelForAgent('atendimento').id;
const usage = { input: 0, output: 0, calls: 0 };

async function classify(lead: CampaignLeadDeal): Promise<SaleDetection> {
  const lines = await saleDetectionRepository.getContactTranscript(lead.contactId, `${since}T00:00:00-03:00`);
  const base = { dealId: lead.dealId, contactId: lead.contactId, model: modelId, appliedAt: null };
  if (lines.length === 0) {
    return { ...base, verdict: 'not_sold', confidence: 0, evidence: 'sem mensagens no período', value: null, inputTokens: null, outputTokens: null };
  }

  const response = await callModel('atendimento', {
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Campanha: ${lead.campaignName}\n\nConversa (mais antiga → mais recente):\n${buildTranscript(lines)}` },
    ],
  });
  usage.calls++;
  usage.input += response.inputTokens ?? 0;
  usage.output += response.outputTokens ?? 0;

  const parsed = extractJson(response.content);
  const confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0)));
  return {
    ...base,
    verdict: asVerdict(parsed.verdict),
    confidence,
    evidence: typeof parsed.evidence === 'string' ? parsed.evidence.trim().slice(0, 1000) : null,
    value: asValue(parsed.value),
    inputTokens: response.inputTokens ?? null,
    outputTokens: response.outputTokens ?? null,
  };
}

async function main(): Promise<void> {
  let leads = await saleDetectionRepository.listCampaignLeadsWithOpenDeal(`${since}T00:00:00-03:00`, `${until}T00:00:00-03:00`);
  if (limit) leads = leads.slice(0, limit);
  console.log(`${leads.length} lead(s) de campanha com oportunidade aberta (${since} → ${until})${dryRun ? ' — DRY-RUN, nenhuma oportunidade será movida' : ''}`);

  const saved = reclassify ? new Map<string, SaleDetection>() : await saleDetectionRepository.getDetections(leads.map((l) => l.dealId));
  const ganhoId = dryRun ? null : await saleDetectionRepository.getGanhoStageId();

  const results: Array<{ lead: CampaignLeadDeal; detection: SaleDetection; applied: boolean }> = [];
  let failed = 0;
  let done = 0;
  const queue = [...leads];

  async function worker(): Promise<void> {
    for (let lead = queue.shift(); lead; lead = queue.shift()) {
      try {
        let detection = saved.get(lead.dealId);
        if (!detection) {
          detection = await classify(lead);
          await saleDetectionRepository.saveDetection(detection);
        }
        let applied = false;
        if (ganhoId && detection.verdict === 'sold' && detection.confidence >= minConfidence && !detection.appliedAt) {
          applied = await saleDetectionRepository.markWonIfOpen(lead.dealId, ganhoId, detection.value);
        }
        results.push({ lead, detection, applied });
      } catch (error) {
        failed++;
        console.warn(`  falha em ${lead.contactName ?? lead.contactId}: ${String(error).slice(0, 200)}`);
      }
      if (++done % 25 === 0 || done === leads.length) console.log(`  ${done}/${leads.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const confident = results.filter((r) => r.detection.verdict === 'sold' && r.detection.confidence >= minConfidence);
  const count = (v: SaleVerdict) => results.filter((r) => r.detection.verdict === v).length;
  console.log('\n=== Resultado ===');
  console.log(`Fechou (certeza ≥ ${minConfidence}): ${confident.length}`);
  console.log(`Fechou com certeza menor: ${count('sold') - confident.length}`);
  console.log(`Dúvida: ${count('unclear')}`);
  console.log(`Não fechou: ${count('not_sold')}`);
  if (failed) console.log(`Falhas: ${failed}`);
  if (!dryRun) console.log(`Movidas para Ganho agora: ${results.filter((r) => r.applied).length}`);

  const byCampaign = new Map<string, { sold: number; total: number; value: number }>();
  for (const r of results) {
    const c = byCampaign.get(r.lead.campaignName) ?? { sold: 0, total: 0, value: 0 };
    c.total++;
    if (confident.includes(r)) { c.sold++; c.value += r.detection.value ?? 0; }
    byCampaign.set(r.lead.campaignName, c);
  }
  console.log('\n=== Por campanha (fechou / leads, valor citado) ===');
  for (const [name, c] of [...byCampaign].sort((a, b) => b[1].sold - a[1].sold)) {
    console.log(`  ${name}: ${c.sold}/${c.total}${c.value ? ` — R$ ${c.value.toLocaleString('pt-BR')}` : ''}`);
  }

  console.log('\n=== Amostra de evidências (fechou) ===');
  for (const r of confident.slice(0, 10)) {
    console.log(`  • ${r.lead.contactName ?? r.lead.contactId} [${r.lead.campaignName}] ${r.detection.confidence}%${r.detection.value ? ` R$ ${r.detection.value}` : ''}\n    ${r.detection.evidence}`);
  }

  const cost = (usage.input * PRICE_IN + usage.output * PRICE_OUT) / 1_000_000;
  console.log(`\nChamadas novas à OpenAI: ${usage.calls} — ${usage.input} tokens de entrada, ${usage.output} de saída — US$ ${cost.toFixed(4)} (${modelId})`);
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
