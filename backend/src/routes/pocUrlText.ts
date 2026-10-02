import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { configService } from '../config/ConfigService.js';
import { v2Adapter } from '../channels/evolution/V2Adapter.js';

/**
 * POC 2 — does a plain text message carrying an HTTPS link reach WhatsApp and
 * open /pix/test? The alternative to the link button of POC 1 (pocUrlButton.ts,
 * `cta_url`, which Evolution 2.3.7 delivers broken): no sendButtons, no
 * interactive/native-flow envelope. Touches nothing of the Pix flow
 * (PIX_CARD_STYLE, sendPix, requestManualPixReply). Delete together with
 * pocUrlButton.ts and public/pix/test/ once the hypothesis is settled.
 *
 * The body comes from the same builder production text replies use
 * (v2Adapter.sendTextBody, Evolution 2.3.7 is v2) and goes to the same
 * endpoint as EvolutionClient.sendText. It is sent directly rather than through
 * EvolutionClient because sendText keeps only the message id, and the raw
 * response — status and body, accepted or not — is the evidence.
 */
const POC_URL = 'https://chat.luminaledstore.com.br/pix/test';

const POC_TEXT = `Teste Smart Pix

Toque no link abaixo para abrir a página de teste:

${POC_URL}`;

const bodySchema = z.object({
  instance: z.string().min(1),
  number: z.string().regex(/^\d{10,15}$/),
});

const bodyJsonSchema = {
  type: 'object',
  required: ['instance', 'number'],
  properties: {
    instance: { type: 'string', minLength: 1, description: 'Nome da instância na Evolution.', example: 'integra-connect' },
    number: { type: 'string', pattern: '^\\d{10,15}$', description: 'Número de destino, só dígitos com DDI.', example: '5511999999999' },
  },
} as const;

const noopValidator = () => () => true;

export async function pocUrlTextRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/poc/url-text', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['poc'],
      summary: 'POC: send a plain text message with a link to /pix/test',
      security: [{ bearerAuth: [] }],
      body: bodyJsonSchema,
    },
  }, async (request, reply) => {
    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) return reply.code(400).send({ error: 'Informe instance e number (só dígitos, com DDI).' });
    const { instance, number } = bodyResult.data;

    const payload = v2Adapter.sendTextBody({ number, text: POC_TEXT });

    const endpoint = `${configService.require('EVOLUTION_API_URL').replace(/\/$/, '')}/message/sendText/${encodeURIComponent(instance)}`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: configService.require('EVOLUTION_API_KEY') },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let evolution: unknown = text;
      try { evolution = text ? JSON.parse(text) : undefined; } catch { /* keep the raw text */ }
      request.log.info({ instance, evolutionStatus: res.status }, '[poc] url text sent');
      return reply.code(res.ok ? 200 : 502).send({ ok: res.ok, url: POC_URL, payload, evolutionStatus: res.status, evolution });
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ ok: false, url: POC_URL, payload, error: error instanceof Error ? error.message : String(error) });
    }
  });
}
