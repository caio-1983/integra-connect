/**
 * Delivery status of an outbound message, shared between the channel layer
 * (which learns about status changes from provider webhooks) and the
 * persistence layer (which writes them to `messages.status`). Mirrors a
 * subset of the DB's `message_status` enum — 'processing' is DB-only
 * (never produced by a channel).
 */
export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';
