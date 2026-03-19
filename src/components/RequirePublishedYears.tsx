import type { LucideIcon } from 'lucide-react';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import DashboardLayout from '@/components/DashboardLayout';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';
import PageHeaderCard from '@/components/PageHeaderCard';

interface Props {
  /** عنوان الصفحة يُعرض فوق رسالة عدم النشر */
  title: string;
  icon: LucideIcon;
  description?: string;
  children: React.ReactNode;
}

/**
 * مكوّن مغلّف يعرض NoPublishedYearsNotice تلقائياً
 * إذا لم تكن هناك سنوات مالية منشورة — بدلاً من تكرار نفس الحارس في كل صفحة.
 */
const RequirePublishedYears = ({ title, icon, description, children }: Props) => {
  const { noPublishedYears } = useFiscalYear();

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-5">
          <PageHeaderCard title={title} icon={icon} description={description} />
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  return <>{children}</>;
};

export default RequirePublishedYears;
