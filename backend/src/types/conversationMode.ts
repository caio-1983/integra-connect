/**
 * Channel-agnostic conversation mode used by the runtime/services (Ajuste 3).
 * The DB's `conversation_status` enum ('nina'|'human'|'paused') is an
 * implementation detail — translation to/from this type happens ONLY inside
 * `ConversationRepository`, so no service or the runtime ever sees 'nina'.
 */
export type ConversationMode = 'autonomous' | 'copilot' | 'human_only' | 'paused';
