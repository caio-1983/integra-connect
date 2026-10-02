import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { configService } from '../config/ConfigService.js';

/**
 * POC — does Evolution 2.3.7 deliver a link button (`cta_url`) that WhatsApp
 * shows and opens? Proves the transport only, ahead of a "Smart Pix" page.
 * Touches nothing of the Pix flow (PIX_CARD_STYLE, sendPix,
 * requestManualPixReply). Delete together with public/pix/test/ once the
 * hypothesis is settled.
 *
 * Calls Evolution directly rather than through EvolutionClient so the raw
 * response — status and body, accepted or not — comes back to whoever runs the
 * test: that response is the evidence.
 */
const POC_URL = 'https://chat.luminaledstore.com.br/pix/test';

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

export async function pocUrlButtonRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/poc/url-button', {
    preHandler: authMiddleware,
    validatorCompiler: noopValidator,
    schema: {
      tags: ['poc'],
      summary: 'POC: send a message with an "Abrir teste" link button to /pix/test',
      security: [{ bearerAuth: [] }],
      body: bodyJsonSchema,
    },
  }, async (request, reply) => {
    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) return reply.code(400).send({ error: 'Informe instance e number (só dígitos, com DDI).' });
    const { instance, number } = bodyResult.data;

    // Verified against the v2.3.7 source: a `url` button becomes a `cta_url`
    // native-flow button ({display_text, url, merchant_url}), in the same
    // viewOnce/interactiveMessage envelope as `copy`. No thumbnail/footer: the
    // fewer parts, the clearer what a failure is about.
    const payload = {
      number,
      title: 'Teste Smart Pix',
      description: 'Toque no botão para abrir a página de teste.',
      buttons: [{ type: 'url', displayText: 'Abrir teste', url: POC_URL }],
    };

    const endpoint = `${configService.require('EVOLUTION_API_URL').replace(/\/$/, '')}/message/sendButtons/${encodeURIComponent(instance)}`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: configService.require('EVOLUTION_API_KEY') },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let evolution: unknown = text;
      try { evolution = text ? JSON.parse(text) : undefined; } catch { /* keep the raw text */ }
      request.log.info({ instance, evolutionStatus: res.status }, '[poc] url button sent');
      return reply.code(res.ok ? 200 : 502).send({ ok: res.ok, url: POC_URL, payload, evolutionStatus: res.status, evolution });
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ ok: false, url: POC_URL, payload, error: error instanceof Error ? error.message : String(error) });
    }
  });
}
