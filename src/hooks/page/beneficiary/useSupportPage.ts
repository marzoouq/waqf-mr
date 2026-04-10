/**
 * هوك صفحة الدعم الفني للمستفيد
 */
import { useState } from 'react';
import { useSupportTickets, type SupportTicket } from '@/hooks/data/support/useSupportTickets';

export const useSupportPage = () => {
  const { data, isLoading } = useSupportTickets();
  const tickets = data?.tickets ?? [];
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);

  return {
    tickets,
    isLoading,
    selectedTicket,
    setSelectedTicket,
    showNewTicket,
    setShowNewTicket,
  };
};
