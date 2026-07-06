import type { AgentId, AIChatMessage, AIChatRequest, AIChatResponse, ToolExecutionContext } from '../types/index.js';
import { callModel } from './ModelGateway.js';
import { getTool } from '../tools/registry.js';
import { aiEventBus } from './EventBus.js';
import { logger } from '../logger/Logger.js';
import type { ExecutionContext } from '../types/index.js';

const MAX_ITERATIONS = 3;

/**
 * The LLM ⇄ tool round trip: call the model, and while it asks for tool
 * calls, execute them (with `ToolExecutionContext`, never raw parameters)
 * and feed the results back, capped at `MAX_ITERATIONS` — a minimal
 * loop-prevention safety net (full Entrega 11 security config is deferred).
 */
export async function runToolLoop(
  agentId: AgentId,
  initialRequest: Omit<AIChatRequest, 'model'>,
  toolExecutionContext: ToolExecutionContext,
  executionContext: ExecutionContext,
): Promise<{ response: AIChatResponse; toolsUsed: string[] }> {
  const messages: AIChatMessage[] = [...initialRequest.messages];
  const toolsUsed: string[] = [];

  let response = await callModel(agentId, { ...initialRequest, messages });
  let iterations = 0;

  while (response.toolCalls && response.toolCalls.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    messages.push({ role: 'assistant', content: response.content });

    for (const call of response.toolCalls) {
      const tool = getTool(call.name);
      let resultSummary: string;

      if (!tool) {
        resultSummary = `Ferramenta "${call.name}" não encontrada.`;
        logger.warn({ requestId: executionContext.requestId, tool: call.name }, 'tool not found');
      } else {
        const result = await tool.execute(call.arguments, toolExecutionContext);
        resultSummary = result.summary;
        toolsUsed.push(tool.id);
        aiEventBus.publish({
          type: 'tool.executed',
          executionContext,
          payload: { tool: tool.id, success: result.success },
          timestamp: new Date(),
        });
      }

      messages.push({ role: 'tool', content: resultSummary, toolCallId: call.id, name: call.name });
    }

    response = await callModel(agentId, { ...initialRequest, messages });
  }

  return { response, toolsUsed };
}
