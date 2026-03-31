import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyUser } from '@/utils/notifications';

interface Beneficiary {
  id: string;
  arabic_name?: string;
  english_name?: string;
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
        .select('id, arabic_name, english_name')
        .order('arabic_name', { ascending: true });

      if (error) throw error;
      return (data as Beneficiary[]) || [];
    },
  });

  // Send notifications
  const sendNotifications = useMutation({
    mutationFn: async (beneficiaryIds: string[]) => {
      if (!beneficiaryIds.length) {
        throw new Error('يجب تحديد مستفيد واحد على الأقل');
      }

      const { data, error } = await supabase.rpc('notify_all_beneficiaries', {
        beneficiary_ids: beneficiaryIds,
        message_content: message,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم إرسال الإخطارات بنجاح');
      setMessage('');
      setSelectedBeneficiaries([]);
      notifyUser('success', 'تم إرسال الإخطارات');
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

  const handleSendNotifications = async () => {
    await sendNotifications.mutateAsync(selectedBeneficiaries);
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
