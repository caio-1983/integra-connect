import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', { schema: { tags: ['health'], summary: 'Health check' } }, async () => ({ status: 'ok' }));
}
