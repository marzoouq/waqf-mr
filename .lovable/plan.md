# الموجة E — `messagingKeys` + `supportKeys` + `notificationsKeys`

## 1. ثلاث factory جديدة

### `src/lib/queryKeys/messagingKeys.ts`
```text
messagingKeys.conversations.byType(type)               → ['conversations', type]
messagingKeys.conversations.prefix                      → ['conversations']
messagingKeys.messages.byConversation(conversationId)  → ['messages', conversationId]
messagingKeys.messages.prefix                           → ['messages']
messagingKeys.unread.byUser(userId)                     → ['unread-messages-count', userId]
messagingKeys.unread.prefix                             → ['unread-messages-count']
```

### `src/lib/queryKeys/supportKeys.ts`
```text
supportKeys.tickets.list(statusFilter, page, pageSize) → ['support_tickets', statusFilter ?? 'all', page, pageSize]
supportKeys.tickets.prefix                              → ['support_tickets']
supportKeys.replies.byTicket(ticketId)                  → ['ticket_replies', ticketId]
supportKeys.replies.prefix                              → ['ticket_replies']
supportKeys.stats()                                     → ['support_stats']
supportKeys.analytics()                                 → ['support_analytics']
```

### `src/lib/queryKeys/notificationsKeys.ts`
```text
notificationsKeys.byUser(userId)                        → ['notifications', userId]
notificationsKeys.prefix                                → ['notifications']
```

## 2. تحديث 9 ملفات

| الملف | البنود |
|---|---|
| `hooks/data/messaging/useMessaging.ts` | 7 أسطر (18, 28, 48, 69, 123, 124, 147) |
| `hooks/data/messaging/useUnreadMessages.ts` | سطر 14 |
| `hooks/data/support/useSupportTickets.ts` | سطران 55, 83 |
| `hooks/data/support/useSupportTicketMutations.ts` | 5 أسطر (18, 36, 49, 50, 62) |
| `hooks/data/support/useSupportAnalytics.ts` | سطران 12, 43 |
| `hooks/data/notifications/useNotifications.ts` | سطر 31 |
| `hooks/data/notifications/useNotificationActions.ts` | سطر 154 |
| `hooks/data/core/usePrefetchPages.ts` | سطر 127 (`{ queryKey: ['conversations'], ... }` prefetch) |
| `hooks/page/admin/messaging/useBulkMessageSender.ts` | سطر 57 |

## 3. التحقق

```bash
rg -n "queryKey:\s*\[['\"](?:conversations|messages|unread-messages-count|support_tickets|ticket_replies|support_stats|support_analytics|notifications)" src/
# expected: 0

# الفحص الشامل لكل المشروع
rg -n "queryKey:\s*\[['\"]" src/hooks src/components src/pages src/lib | grep -v "Keys\."
# expected: فقط ما تبقى للموجة F (admin/audit/content/email) + page-hook retry literals
```

## نطاق محدود
- لا تغيير لمنطق أو signatures
- 3 ملفات جديدة + 9 تعديلات
