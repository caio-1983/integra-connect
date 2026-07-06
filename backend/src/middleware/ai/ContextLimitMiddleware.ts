import type { AIMiddleware } from './AIMiddleware.js';

/** Pass-through this sprint — prepared to trim/limit context by the model's context window before calling it. */
export const contextLimitMiddleware: AIMiddleware = {
  name: 'context-limit',
  async apply(state, next) {
    return next();
  },
};
