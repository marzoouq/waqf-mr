/**
 * UnlinkedAccountNotice — بطاقة موحَّدة لحالة "حسابك غير مرتبط بسجل مستفيد".
 * تستبدل التكرار النصي الذي كان موزَّعاً على 6 صفحات.
 */
import { AlertCircle } from 'lucide-react';
import { EmptyPageState } from '@/components/common';
import { UNLINKED_ACCOUNT_COPY } from '@/constants/beneficiaryCopy';

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
}: UnlinkedAccountNoticeProps) => (
  <EmptyPageState
    icon={AlertCircle}
    title={title}
    description={description}
    withLayout={withLayout}
  />
);

export default UnlinkedAccountNotice;
