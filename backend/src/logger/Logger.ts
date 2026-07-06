import pino from 'pino';
import { configService } from '../config/ConfigService.js';

/**
 * Shared Pino instance — every file in this backend logs through here,
 * never through `console.log`. Fastify is wired to reuse this same instance
 * (see `index.ts`) so HTTP access logs and application logs share one format.
 */
export const logger = pino({
  level: configService.get('LOG_LEVEL') ?? 'info',
  transport: configService.get('NODE_ENV') === 'production'
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
});
