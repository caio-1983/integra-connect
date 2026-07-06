import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/index.js';
import type { AIChatMessage, AIChatRequest, AIChatResponse, AIProviderId, AIToolSchema } from '../types/index.js';
import { BaseAIProvider } from './BaseAIProvider.js';
import { configService } from '../config/ConfigService.js';

/** Merges system+developer into one leading system message — maximizes compatibility across OpenAI model families. */
function toOpenAIMessages(messages: AIChatMessage[]): ChatCompletionMessageParam[] {
  const systemParts: string[] = [];
  const rest: AIChatMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system' || m.role === 'developer') systemParts.push(m.content);
    else rest.push(m);
  }

  const result: ChatCompletionMessageParam[] = [];
  if (systemParts.length > 0) result.push({ role: 'system', content: systemParts.join('\n\n') });
  for (const m of rest) {
    if (m.role === 'tool') {
      result.push({ role: 'tool', content: m.content, tool_call_id: m.toolCallId ?? '' });
    } else {
      result.push({ role: m.role as 'user' | 'assistant', content: m.content });
    }
  }
  return result;
}

function toOpenAITools(tools?: AIToolSchema[]): ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
}

function safeParseArguments(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** The only real provider this sprint — everything else (Claude/Gemini/Ollama) stays a prepared stub. */
class OpenAIProvider extends BaseAIProvider {
  readonly id: AIProviderId = 'openai';
  private client: OpenAI | undefined;

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: configService.require('OPENAI_API_KEY') });
    }
    return this.client;
  }

  async chat(req: AIChatRequest): Promise<AIChatResponse> {
    const startedAt = Date.now();
    const completion = await this.getClient().chat.completions.create({
      model: req.model,
      messages: toOpenAIMessages(req.messages),
      temperature: req.temperature,
      tools: toOpenAITools(req.tools),
    });
    const latencyMs = Date.now() - startedAt;

    const message = completion.choices[0]?.message;
    const toolCalls = message?.tool_calls
      ?.filter((tc): tc is typeof tc & { type: 'function' } => tc.type === 'function')
      .map((tc) => ({ id: tc.id, name: tc.function.name, arguments: safeParseArguments(tc.function.arguments) }));

    return {
      content: message?.content ?? '',
      tokensUsed: completion.usage?.total_tokens,
      latencyMs,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}

export function createOpenAIProvider(): OpenAIProvider {
  return new OpenAIProvider();
}
