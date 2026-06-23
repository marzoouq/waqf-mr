import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, BarChart3, PieChart, BookOpen, FolderArchive, ArrowLeft } from 'lucide-react';

interface BeneficiaryQuickLinksProps {
  role: string | null;
}

const BeneficiaryQuickLinks = ({ role }: BeneficiaryQuickLinksProps) => {
  const quickLinks = useMemo(() => [
    ...(role !== 'waqif' ? [
      { title: 'الإفصاح السنوي', description: 'البيان المالي التفصيلي', icon: FileText, path: '/beneficiary/disclosure', color: 'bg-primary/10 text-primary' },
      { title: 'حصتي من الريع', description: 'تفاصيل حصتك والتوزيعات', icon: PieChart, path: '/beneficiary/my-share', color: 'bg-accent/10 text-accent-foreground' },
    ] : []),
    { title: 'التقارير المالية', description: 'الرسوم البيانية والإحصائيات', icon: BarChart3, path: '/beneficiary/financial-reports', color: 'bg-muted text-muted-foreground' },
    { title: 'اللائحة التنظيمية', description: 'أحكام ولوائح الوقف', icon: BookOpen, path: '/beneficiary/bylaws', color: 'bg-secondary/10 text-secondary' },
    { title: 'أرشيف الوثائق', description: 'الوثائق الرسمية للوقف', icon: FolderArchive, path: '/beneficiary/archive', color: 'bg-primary/10 text-primary' },
  ], [role]);

  return (
    <div>
      <h2 className="text-base sm:text-lg font-bold mb-3">الوصول السريع</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {quickLinks.map((link) => (
          // B6: استخدام Link بدل onClick — يدعم Ctrl+Click + الزر الأوسط + التنقل بلوحة المفاتيح + SEO
          <Link key={link.path} to={link.path} className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
            <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${link.color}`}>
                    <link.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{link.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{link.description}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BeneficiaryQuickLinks;
