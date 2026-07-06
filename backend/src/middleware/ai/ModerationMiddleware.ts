import type { AIMiddleware } from './AIMiddleware.js';

/** Pass-through this sprint — prepared to reject unsafe content before/after the model call. */
export const moderationMiddleware: AIMiddleware = {
  name: 'moderation',
  async apply(state, next) {
    return next();
  },
};
