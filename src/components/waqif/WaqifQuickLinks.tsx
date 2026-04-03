/**
 * روابط الوصول السريع — لوحة الواقف
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, FileText, BarChart3, Wallet, BookOpen } from 'lucide-react';

const quickLinks = [
  { title: 'العقارات', icon: Building2, path: '/beneficiary/properties', color: 'bg-primary/10 text-primary' },
  { title: 'العقود', icon: FileText, path: '/beneficiary/contracts', color: 'bg-accent/10 text-accent-foreground' },
  { title: 'التقارير المالية', icon: BarChart3, path: '/beneficiary/financial-reports', color: 'bg-muted text-muted-foreground' },
  { title: 'الحسابات الختامية', icon: Wallet, path: '/beneficiary/accounts', color: 'bg-secondary/10 text-secondary' },
  { title: 'اللائحة', icon: BookOpen, path: '/beneficiary/bylaws', color: 'bg-primary/10 text-primary' },
];

const WaqifQuickLinks = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h2 className="text-base sm:text-lg font-bold mb-3">الوصول السريع</h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {quickLinks.map((link) => (
          <Card key={link.path} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(link.path)}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.color}`}>
                  <link.icon className="w-5 h-5" />
                </div>
                <p className="font-bold text-sm">{link.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WaqifQuickLinks;
