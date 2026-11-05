/**
 * UnlinkedAccountNotice — بطاقة موحَّدة لحالة "حسابك غير مرتبط بسجل مستفيد".
 * تستبدل التكرار النصي الذي كان موزَّعاً على 6 صفحات، مع زر طلب الربط من الناظر.
 */
import { AlertCircle } from 'lucide-react';
import { EmptyPageState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { UNLINKED_ACCOUNT_COPY } from '@/constants/beneficiaryCopy';
import { useAccountLinkRequest } from '@/hooks/page/beneficiary/useAccountLinkRequest';

interface UnlinkedAccountNoticeProps {
  /** يلفّ المحتوى بـ DashboardLayout (افتراضي true). مرّر false إذا كان السياق ملفوفاً مسبقاً. */
  withLayout?: boolean;
  /** عنوان مخصَّص (افتراضياً النص الموحَّد). */
  title?: string;
  /** وصف مخصَّص (افتراضياً النص الموحَّد). */
  description?: string;
}

const UnlinkedAccountNotice = ({
  withLayout = true,
  title = UNLINKED_ACCOUNT_COPY.title,
  description = UNLINKED_ACCOUNT_COPY.description,
}: UnlinkedAccountNoticeProps) => {
  const { request, isPending, isDone } = useAccountLinkRequest();
  return (
    <EmptyPageState
      icon={AlertCircle}
      title={title}
      description={description}
      withLayout={withLayout}
      action={
        <Button onClick={request} disabled={isPending || isDone}>
          {isDone ? 'تم إرسال الطلب' : isPending ? 'جارٍ الإرسال…' : 'طلب ربط حسابي من الناظر'}
        </Button>
      }
    />
  );
};

export default UnlinkedAccountNotice;
