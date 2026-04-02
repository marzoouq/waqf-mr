/**
 * أنواع الدعم الفني المشتركة
 */
export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  rating: number | null;
  rating_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface ClientError {
  id: string;
  event_type: string;
  target_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
  email: string | null;
}

export interface SupportAnalyticsData {
  category_stats: { key: string; count: number }[];
  priority_stats: { key: string; count: number }[];
  avg_resolution_hours: number;
  avg_rating: number;
  rated_count: number;
  total_count: number;
}

/** الأعمدة المطلوبة فقط لعرض التذاكر */
export const TICKET_SELECT = 'id, ticket_number, title, description, category, priority, status, created_by, assigned_to, resolved_at, resolution_notes, rating, rating_comment, created_at, updated_at';
