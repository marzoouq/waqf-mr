import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Beneficiary {
  id: string;
  name?: string;
  user_id?: string;
}

export const useBulkNotifications = () => {
  const [message, setMessage] = useState('');
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([]);

  // Fetch all beneficiaries
  const { data: beneficiaries = [], isLoading: loadingBeneficiaries } = useQuery({
    queryKey: ['beneficiaries', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('id, name, user_id')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as Beneficiary[]) || [];
    },
  });

  // Send notifications - flexible mutation
  const sendNotifications = useMutation({
    mutationFn: async ({
      title,
      message: msg,
      type,
      link,
      isAll,
    }: {
      title: string;
      message: string;
      type: string;
      link?: string;
      isAll: boolean;
    }) => {
      if (!msg.trim()) {
        throw new Error('الرسالة مطلوبة');
      }

      if (isAll) {
        // Send to all beneficiaries via RPC
        const { data, error } = await supabase.rpc('notify_all_beneficiaries', {
          p_title: title,
          p_message: msg,
          p_type: type,
          p_link: link || null,
        });

        if (error) throw error;
        return data;
      } else {
        // Send to selected beneficiaries directly
        if (selectedBeneficiaries.length === 0) {
          throw new Error('يجب تحديد مستفيد واحد على الأقل');
        }

        const selected = beneficiaries.filter((b) => selectedBeneficiaries.includes(b.id));
        const validUsers = selected.filter((b) => b.user_id);

        if (validUsers.length === 0) {
          throw new Error('المستفيدون المختارون ليس لديهم حسابات مرتبطة');
        }

        const { error } = await supabase.from('notifications').insert(
          validUsers.map((b) => ({
            user_id: b.user_id,
            title,
            message: msg,
            type,
            link: link || null,
          }))
        );

        if (error) throw error;
        return null;
      }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isAll
          ? `تم إرسال الإشعار لجميع المستفيدين`
          : `تم إرسال الإشعار لـ ${selectedBeneficiaries.length} مستفيد`
      );
      setMessage('');
      setSelectedBeneficiaries([]);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال الإخطارات';
      toast.error(errorMessage);
    },
  });

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedBeneficiaries(beneficiaries.map((b) => b.id));
    } else {
      setSelectedBeneficiaries([]);
    }
  };

  const toggleBeneficiary = (id: string) => {
    setSelectedBeneficiaries((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleSendNotifications = async (
    title: string,
    message: string,
    type: string,
    link: string | null,
    isAll: boolean
  ) => {
    await sendNotifications.mutateAsync({
      title,
      message,
      type,
      link: link || undefined,
      isAll,
    });
  };

  return {
    beneficiaries,
    loadingBeneficiaries,
    message,
    setMessage,
    selectedBeneficiaries,
    toggleBeneficiary,
    handleSelectAll,
    handleSendNotifications,
    sending: sendNotifications.isPending,
  };
};
