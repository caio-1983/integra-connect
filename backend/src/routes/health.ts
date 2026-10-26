import { readFileSync } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { configService } from '../config/ConfigService.js';

/** package.json sits two levels up from both src/routes (tsx) and dist/routes (node). */
function packageVersion(): string {
  try {
    const raw = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
    return (JSON.parse(raw) as { version?: string }).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export const APP_VERSION = packageVersion();

/**
 * `version`/`commit` answer "which build is live?" without the Swagger spec,
 * which stays off in production. BUILD_SHA comes in as a Docker build arg.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  const commit = configService.get('BUILD_SHA') || null;
  app.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Health check (+ build identification)',
      security: [],
    },
  }, async () => ({ status: 'ok', version: APP_VERSION, commit }));
}
