/**
 * ملف تجميعي لهوكات المراسلة — يعيد تصدير من الملفات المقسّمة
 * للحفاظ على التوافق الرجعي مع الاستيرادات الحالية
 */
export { useUnreadCounts, type UnreadCounts } from './useUnreadCounts';
export { useConversations } from './useConversations';
export { useMessages } from './useChatMessages';
export { useSendMessage, useCreateConversation } from './useMessageMutations';
export type { Conversation, Message } from '@/types/database';
