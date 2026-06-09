/**
 * مفاتيح TanStack Query للمحادثات والرسائل والعدّاد غير المقروء.
 * استخدم `messagingKeys.<group>.<name>(...)` للاستعلام،
 * و `messagingKeys.<group>.prefix` للإبطال.
 */

export const messagingKeys = {
  conversations: {
    byType: (type: string | null | undefined) => ['conversations', type] as const,
    prefix: ['conversations'] as const,
  },
  messages: {
    byConversation: (conversationId: string | null | undefined) =>
      ['messages', conversationId] as const,
    prefix: ['messages'] as const,
  },
  unread: {
    byUser: (userId: string | null | undefined) =>
      ['unread-messages-count', userId] as const,
    prefix: ['unread-messages-count'] as const,
  },
} as const;
