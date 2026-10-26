import pino from 'pino';
import { configService } from '../config/ConfigService.js';

/**
 * URL segments that are credentials: the webhook path secret
 * (`/webhooks/{provider}/{secret}`) and the Smart Pix link token
 * (`/v1/pix/smart/{token}`). Fastify logs every request's URL, so without this
 * each delivery wrote the Evolution secret into the logs.
 */
const SECRET_PATHS: Array<[RegExp, string]> = [
  [/^(\/webhooks\/[^/?#]+\/)[^/?#]+/, '$1[redacted]'],
  [/^(\/v1\/pix\/smart\/)[^/?#]+/, '$1[redacted]'],
];

export function redactUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return SECRET_PATHS.reduce((acc, [re, replacement]) => acc.replace(re, replacement), url);
}

interface LoggedRequest {
  method?: string;
  url?: string;
  host?: string;
  ip?: string;
  socket?: { remotePort?: number };
}

/**
 * Shared Pino instance — every file in this backend logs through here,
 * never through `console.log`. Fastify is wired to reuse this same instance
 * (see `index.ts`) so HTTP access logs and application logs share one format.
 *
 * The `req` serializer replaces Fastify's default (same fields) so URLs are
 * redacted; a serializer on the instance takes precedence over Fastify's.
 */
export const logger = pino({
  level: configService.get('LOG_LEVEL') ?? 'info',
  serializers: {
    req(req: LoggedRequest) {
      return {
        method: req.method,
        url: redactUrl(req.url),
        host: req.host,
        remoteAddress: req.ip,
        remotePort: req.socket?.remotePort,
      };
    },
  },
  transport: configService.get('NODE_ENV') === 'production'
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
});
