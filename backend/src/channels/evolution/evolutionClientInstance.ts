import { EvolutionClient } from './EvolutionClient.js';
import { configService } from '../../config/ConfigService.js';

let instance: EvolutionClient | undefined;

/** Lazily-built singleton so config is only read when the Evolution integration is actually used. */
export function getEvolutionClient(): EvolutionClient {
  if (!instance) {
    instance = new EvolutionClient(
      configService.require('EVOLUTION_API_URL'),
      configService.require('EVOLUTION_API_KEY'),
    );
  }
  return instance;
}
