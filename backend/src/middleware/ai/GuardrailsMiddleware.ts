import type { AIMiddleware } from './AIMiddleware.js';

/** Pass-through this sprint — prepared to block prompts that violate policy before they reach the model. */
export const guardrailsMiddleware: AIMiddleware = {
  name: 'guardrails',
  async apply(state, next) {
    return next();
  },
};
