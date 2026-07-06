import type { AIMiddleware } from './AIMiddleware.js';

/** Pass-through this sprint — prepared to enforce `ToolExecutionContext.permissions` before tools execute. */
export const toolPermissionMiddleware: AIMiddleware = {
  name: 'tool-permission',
  async apply(state, next) {
    return next();
  },
};
