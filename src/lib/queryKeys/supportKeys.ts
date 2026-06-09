/**
 * مفاتيح TanStack Query لتذاكر الدعم الفني وردودها وإحصاءاتها.
 */

export const supportKeys = {
  tickets: {
    list: (
      statusFilter: string | null | undefined,
      page: number,
      pageSize: number,
    ) => ['support_tickets', statusFilter ?? 'all', page, pageSize] as const,
    prefix: ['support_tickets'] as const,
  },
  replies: {
    byTicket: (ticketId: string | null | undefined) =>
      ['ticket_replies', ticketId] as const,
    prefix: ['ticket_replies'] as const,
  },
  stats: () => ['support_stats'] as const,
  analytics: () => ['support_analytics'] as const,
} as const;
