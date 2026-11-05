/**
 * useAccountLinkRequest — غلاف صفحة لطلب ربط الحساب مع رسائل المستخدم
 */
import { toast } from 'sonner';
import { useRequestAccountLink } from '@/hooks/data/beneficiaries/useRequestAccountLink';
import { logger } from '@/lib/logger';

const MESSAGES = {
  sent: 'أُرسل طلبك إلى ناظر الوقف، وسيُربط حسابك بعد المراجعة',
  already_requested: 'طلبك قيد المراجعة — يمكن إعادة الإرسال بعد 24 ساعة',
  already_linked: 'حسابك مرتبط بالفعل — أعد تحميل الصفحة',
} as const;

export const useAccountLinkRequest = () => {
  const m = useRequestAccountLink();
  const request = () =>
    m.mutate(undefined, {
      onSuccess: (r) => toast.success(MESSAGES[r] ?? MESSAGES.sent),
      onError: (e) => { logger.error('[AccountLink] فشل الطلب', e); toast.error('تعذّر إرسال الطلب، حاول لاحقًا'); },
    });
  return { request, isPending: m.isPending, isDone: m.isSuccess };
};
