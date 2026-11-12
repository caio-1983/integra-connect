/**
 * Manual run of the EvolutionReconciler (the server runs it on its own every
 * RECONCILE_INTERVAL_MS). Stores WhatsApp messages that are in Evolution's own
 * store but never reached us through the webhook — e.g. right after a number
 * is re-paired, whose synced history never goes through the webhook.
 *
 *   npx tsx src/scripts/reconcileEvolution.ts --dry-run
 *   npx tsx src/scripts/reconcileEvolution.ts --instance "Stefani IOS"
 *   In the container: node dist/scripts/reconcileEvolution.js [flags]
 *
 * Window: RECONCILE_LOOKBACK_HOURS (72). Skips the in-flight grace period, so
 * run it when the number is not receiving a burst at that very moment.
 */
import 'dotenv/config';
import { reconcileAll } from '../channels/evolution/EvolutionReconciler.js';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const report = await reconcileAll({
  dryRun: args.includes('--dry-run'),
  graceMs: 0,
  instance: flag('--instance'),
});
console.log(JSON.stringify(report, null, 2));
// The live pipeline handles re-posted events asynchronously off the bus.
setTimeout(() => process.exit(0), 15_000);
