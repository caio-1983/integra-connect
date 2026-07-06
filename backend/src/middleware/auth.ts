import type { FastifyReply, FastifyRequest } from 'fastify';
import { configService } from '../config/ConfigService.js';

/** HTTP-level auth between the Integra Connect frontend and this backend — not the OpenAI key. */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  const provided = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const expected = configService.require('GATEWAY_API_KEY');

  if (!provided || provided !== expected) {
    reply.code(401).send({ error: 'unauthorized' });
  }
}
