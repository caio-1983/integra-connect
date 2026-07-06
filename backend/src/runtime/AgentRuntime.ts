import type { AgentChatRequestDTO, AgentChatResponseDTO, AgentId, ExecutionContext, PipelineState, PipelineStep, ToolExecutionContext } from '../types/index.js';
import { getAgent } from '../agents/registry.js';
import { resolveModelForAgent } from '../models/agentModelMap.js';
import { runPipeline } from './Pipeline.js';
import { aiEventBus } from './EventBus.js';
import { generateRequestId } from '../utils/ids.js';
import { buildContextStep } from './steps/buildContextStep.js';
import { recallMemoryStep } from './steps/recallMemoryStep.js';
import { searchKnowledgeStep } from './steps/searchKnowledgeStep.js';
import { buildPromptStep } from './steps/buildPromptStep.js';
import { runModelStep } from './steps/runModelStep.js';
import { postProcessingStep } from './steps/postProcessingStep.js';
import { handoffStep } from './steps/handoffStep.js';
import { buildResponseStep } from './steps/buildResponseStep.js';

const DEFAULT_STEPS: PipelineStep[] = [
  buildContextStep,
  recallMemoryStep,
  searchKnowledgeStep,
  buildPromptStep,
  runModelStep,
  postProcessingStep,
  handoffStep,
  buildResponseStep,
];

/**
 * A thin coordinator, not a place where logic accumulates: build the
 * execution/tool contexts, assemble the pipeline, run it, publish lifecycle
 * events. No business logic lives here — that's what the steps are for.
 */
export async function runAgentChat(
  agentId: AgentId,
  request: AgentChatRequestDTO,
  organizationId = 'default-org',
): Promise<AgentChatResponseDTO> {
  const agent = getAgent(agentId);
  const model = resolveModelForAgent(agentId);
  const requestId = generateRequestId();

  const executionContext: ExecutionContext = {
    requestId,
    organizationId,
    conversationId: request.conversationId,
    agentId,
    modelId: model.id,
    providerId: model.provider,
    startedAt: new Date(),
  };

  const toolExecutionContext: ToolExecutionContext = {
    organizationId,
    conversationId: request.conversationId,
    contactId: request.contactId,
    permissions: [],
    requestId,
  };

  aiEventBus.publish({
    type: 'execution.started',
    executionContext,
    payload: { channel: request.channel },
    timestamp: new Date(),
  });

  const latestCustomerMessage = [...request.messages].reverse().find((m) => m.fromType === 'user');

  const initialState: PipelineState = {
    executionContext,
    toolExecutionContext,
    agent,
    channel: request.channel,
    messages: request.messages,
    latestCustomerMessage,
  };

  try {
    const finalState = await runPipeline(DEFAULT_STEPS, initialState);
    if (!finalState.response) {
      throw new Error('[runtime] Pipeline concluído sem gerar resposta.');
    }

    aiEventBus.publish({
      type: 'execution.completed',
      executionContext,
      payload: {
        durationMs: Date.now() - executionContext.startedAt.getTime(),
        toolsUsed: finalState.toolsUsed ?? [],
        handoffRequired: finalState.handoff?.required ?? false,
      },
      timestamp: new Date(),
    });

    return finalState.response;
  } catch (error) {
    aiEventBus.publish({
      type: 'execution.failed',
      executionContext,
      payload: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date(),
    });
    throw error;
  }
}
