/**
 * هوك صفحة الدعم الفني للمستفيد
 *
 * #71 من الفحص العميق: يُعيد `isError` و `error` ليُتاح للصفحة عرض رسالة خطأ
 * صريحة بدلاً من إظهار قائمة فارغة عند فشل الجلب.
 */
import { useState } from 'react';
import { useSupportTickets, type SupportTicket } from '@/hooks/data/support/useSupportTickets';

export const useSupportPage = () => {
  const { data, isLoading, isError, error, refetch } = useSupportTickets();
  const tickets = data?.tickets ?? [];
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);

  return {
    tickets,
    isLoading,
    isError,
    error,
    refetch,
    selectedTicket,
    setSelectedTicket,
    showNewTicket,
    setShowNewTicket,
  };
};
