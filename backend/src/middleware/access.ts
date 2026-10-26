import type { FastifyReply, FastifyRequest } from 'fastify';
import { accessRepository, type InstanceVisibility } from '../persistence/AccessRepository.js';
import type { AuthUser } from './auth.js';

/**
 * Instance names as Evolution accepts them and as they exist today
 * ('integra-connect', 'Juliana Coutinho'): letters (accents included), digits,
 * space, `_`, `.`, `-`. Anything else, `/`, `?`, `#` or `%` above all, could
 * reshape the Evolution URL the name is interpolated into.
 */
export const INSTANCE_NAME_RE = /^[\p{L}\p{N} _.-]{1,64}$/u;

export function isValidInstanceName(name: unknown): name is string {
  return typeof name === 'string' && INSTANCE_NAME_RE.test(name);
}

/**
 * Mirrors `can_access_conversation` for a number instead of a conversation:
 * a private number is its owner's alone (admins included), otherwise admins
 * see every number and everyone else only the numbers granted to them.
 */
export function canAccessInstance(user: AuthUser, instanceName: string, visibility: InstanceVisibility): boolean {
  const owner = visibility.privateOwners.get(instanceName);
  if (owner) return owner === user.id;
  return user.role === 'admin' || visibility.granted.has(instanceName);
}

export async function userCanAccessInstance(user: AuthUser, instanceName: string): Promise<boolean> {
  return canAccessInstance(user, instanceName, await accessRepository.getInstanceVisibility(user.id));
}

/**
 * preHandler for every `/v1/conversations/:conversationId/...` route, after
 * authMiddleware. A conversation the user may not see answers 404, the same as
 * one that does not exist, so ids cannot be probed.
 */
export async function requireConversationAccess(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.authUser;
  const { conversationId } = (request.params ?? {}) as { conversationId?: string };
  if (!user || !conversationId) {
    reply.code(404).send({ error: 'Conversa não encontrada.' });
    return;
  }
  try {
    if (!(await accessRepository.canAccessConversation(conversationId, user.id))) {
      reply.code(404).send({ error: 'Conversa não encontrada.' });
    }
  } catch (error) {
    request.log.error(error, '[access] conversation access check failed');
    reply.code(500).send({ error: 'Não foi possível verificar o acesso à conversa.' });
  }
}

/**
 * preHandler for `/v1/whatsapp/instances/:name/...`, after authMiddleware and
 * the role guard: the name must be well-formed and a number this user can see.
 * Unseen numbers answer 404, like conversations.
 */
export async function requireInstanceAccess(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.authUser;
  const { name } = (request.params ?? {}) as { name?: string };
  if (!isValidInstanceName(name)) {
    reply.code(400).send({ error: 'Nome de instância inválido.' });
    return;
  }
  try {
    if (!user || !(await userCanAccessInstance(user, name))) {
      reply.code(404).send({ error: 'Instância não encontrada.' });
    }
  } catch (error) {
    request.log.error(error, '[access] instance access check failed');
    reply.code(500).send({ error: 'Não foi possível verificar o acesso à instância.' });
  }
}

/** The ids among `messageIds` whose conversation the user can access — for routes keyed by message. */
export async function accessibleMessageIds(user: AuthUser, messageIds: string[]): Promise<Set<string>> {
  const conversations = await accessRepository.getMessageConversations(messageIds);
  const distinct = [...new Set(conversations.values())];
  const allowed = new Set<string>();
  await Promise.all(distinct.map(async (conversationId) => {
    if (await accessRepository.canAccessConversation(conversationId, user.id)) allowed.add(conversationId);
  }));
  return new Set([...conversations].filter(([, conversationId]) => allowed.has(conversationId)).map(([messageId]) => messageId));
}
