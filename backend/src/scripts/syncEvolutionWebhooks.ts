/**
 * Re-points the webhook of EVERY Evolution instance at the URL built from the
 * current PUBLIC_BASE_URL + EVOLUTION_WEBHOOK_SECRET. Run it right after
 * rotating the secret (or moving the domain): until then Evolution keeps
 * posting to the old URL, which now answers 401, and inbound messages are lost.
 *
 * Reads the same env as the server, so inside the running container:
 *   docker exec ai-runtime node dist/scripts/syncEvolutionWebhooks.js
 * or locally, with the production env loaded:
 *   npx tsx src/scripts/syncEvolutionWebhooks.ts
 *
 * Never prints the URL: it carries the secret.
 */
import { evolutionConnectionService } from '../channels/evolution/EvolutionConnectionService.js';

async function main(): Promise<void> {
  console.log(`Webhook alvo: ${evolutionConnectionService.maskedWebhookUrl()}`);
  const results = await evolutionConnectionService.syncAllWebhooks();
  for (const r of results) {
    console.log(`  ${r.ok ? 'ok   ' : 'FALHA'} ${r.instance}${r.error ? ` — ${r.error.slice(0, 160)}` : ''}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} instância(s) atualizada(s).`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
