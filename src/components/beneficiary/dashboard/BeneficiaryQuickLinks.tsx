import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, BarChart3, PieChart, BookOpen, ArrowLeft } from 'lucide-react';

interface BeneficiaryQuickLinksProps {
  role: string | null;
}

const BeneficiaryQuickLinks = ({ role }: BeneficiaryQuickLinksProps) => {
  const navigate = useNavigate();

  const quickLinks = useMemo(() => [
    ...(role !== 'waqif' ? [
      { title: 'الإفصاح السنوي', description: 'البيان المالي التفصيلي', icon: FileText, path: '/beneficiary/disclosure', color: 'bg-primary/10 text-primary' },
      { title: 'حصتي من الريع', description: 'تفاصيل حصتك والتوزيعات', icon: PieChart, path: '/beneficiary/my-share', color: 'bg-accent/10 text-accent-foreground' },
    ] : []),
    { title: 'التقارير المالية', description: 'الرسوم البيانية والإحصائيات', icon: BarChart3, path: '/beneficiary/financial-reports', color: 'bg-muted text-muted-foreground' },
    { title: 'اللائحة التنظيمية', description: 'أحكام ولوائح الوقف', icon: BookOpen, path: '/beneficiary/bylaws', color: 'bg-secondary/10 text-secondary' },
  ], [role]);

  return (
    <div>
      <h2 className="text-base sm:text-lg font-bold mb-3">الوصول السريع</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {quickLinks.map((link) => (
          <Card key={link.path} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(link.path)}>
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
        ))}
      </div>
    </div>
  );
};

export default BeneficiaryQuickLinks;
