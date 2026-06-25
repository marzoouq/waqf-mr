/**
 * أنواع نظام تذاكر الدعم الفني — مشتركة بين طبقات data/lib/components
 * نُقلت هنا لمنع كسر اتجاه الاعتماد (lib/ لا يجوز أن يستورد من hooks/).
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
