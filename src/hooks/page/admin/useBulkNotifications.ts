import { useState } from 'react';
import { defaultNotify } from '@/lib/notify';
import { useNotificationBeneficiaries } from '@/hooks/data/notifications/useNotificationBeneficiaries';
import { notifyAllBeneficiaries, insertNotifications } from '@/lib/services';

interface Beneficiary {
  id: string;
  name?: string;
  user_id?: string;
}

export const useBulkNotifications = () => {
  const [message, setMessage] = useState('');
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const { data: beneficiaries = [], isLoading: loadingBeneficiaries } = useNotificationBeneficiaries();

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
    if (!message.trim()) {
      defaultNotify.error('الرسالة مطلوبة');
      return;
    }
    setSending(true);
    try {
      if (isAll) {
        await notifyAllBeneficiaries(title, message, type, link || undefined);
      } else {
        if (selectedBeneficiaries.length === 0) {
          throw new Error('يجب تحديد مستفيد واحد على الأقل');
        }
        const selected = beneficiaries.filter((b) => selectedBeneficiaries.includes(b.id));
        const validUsers = selected.filter((b): b is Beneficiary & { user_id: string } => !!b.user_id);
        if (validUsers.length === 0) {
          throw new Error('المستفيدون المختارون ليس لديهم حسابات مرتبطة');
        }
        await insertNotifications(
          validUsers.map((b) => ({
            user_id: b.user_id,
            title,
            message,
            type,
            link: link ?? null,
          }))
        );
      }
      defaultNotify.success(
        isAll
          ? `تم إرسال الإشعار لجميع المستفيدين`
          : `تم إرسال الإشعار لـ ${selectedBeneficiaries.length} مستفيد`
      );
      setMessage('');
      setSelectedBeneficiaries([]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال الإخطارات';
      defaultNotify.error(errorMessage);
    } finally {
      setSending(false);
    }
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
    sending,
  };
};
