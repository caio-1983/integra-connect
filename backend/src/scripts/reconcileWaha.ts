/**
 * Manual run of the WahaReconciler (the server runs it on its own every
 * RECONCILE_INTERVAL_MS). Stores messages WAHA has — e.g. the history synced
 * when a number is paired — that never reached us through the webhook.
 *
 *   In the container (Portainer → ai-runtime → Console):
 *     node dist/scripts/reconcileWaha.js --dry-run --instance "Stefani IOS" --hours 120
 *     node dist/scripts/reconcileWaha.js --instance "Stefani IOS" --hours 120
 *
 * Skips the in-flight grace period, so run it when the number is not receiving
 * a burst at that very moment.
 */
import 'dotenv/config';
// The live pipeline must be listening: messages with no thread yet are handed
// to it through the event bus, inside this same process.
import '../channels/ChannelOrchestrator.js';
import '../conversation/ConversationService.js';
import { reconcileWaha } from '../channels/waha/WahaReconciler.js';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const report = await reconcileWaha({
  dryRun: args.includes('--dry-run'),
  graceMs: 0,
  instance: flag('--instance'),
  hours: flag('--hours') ? Number(flag('--hours')) : undefined,
});
console.log(JSON.stringify(report, null, 2));
// The live pipeline handles re-posted events asynchronously off the bus.
setTimeout(() => process.exit(0), 20_000);
