import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, FileText, BarChart3, ArrowLeft, Shield, Wallet } from 'lucide-react';
import { useEffect } from 'react';

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (role === 'admin') {
        navigate('/dashboard');
      } else if (role === 'beneficiary' || role === 'waqif') {
        navigate('/beneficiary');
      }
    }
  }, [user, role, loading, navigate]);

  const features = [
    { icon: Building2, title: 'إدارة العقارات', description: 'تسجيل ومتابعة جميع عقارات الوقف' },
    { icon: FileText, title: 'إدارة العقود', description: 'تنظيم عقود الإيجار والمستأجرين' },
    { icon: Wallet, title: 'الدخل والمصروفات', description: 'تتبع جميع المعاملات المالية' },
    { icon: Users, title: 'إدارة المستفيدين', description: 'توزيع الحصص ومتابعة المستفيدين' },
    { icon: BarChart3, title: 'التقارير', description: 'إعداد الإفصاحات والتقارير السنوية' },
    { icon: Shield, title: 'أمان متقدم', description: 'حماية البيانات وإدارة الصلاحيات' },
  ];

  return (
    <div className="min-h-screen gradient-hero pattern-islamic">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto animate-slide-up">
          <div className="mx-auto w-20 h-20 gradient-gold rounded-2xl flex items-center justify-center shadow-elegant mb-8">
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            نظام إدارة الوقف
          </h1>
          <p className="text-xl text-primary-foreground/80 mb-8">
            منصة متكاملة لإدارة أملاك الوقف وتوزيع الريع على المستفيدين
          </p>
          <Button
            onClick={() => navigate('/auth')}
            size="lg"
            className="gradient-gold text-primary-foreground gap-2 shadow-elegant hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
            دخول النظام
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-background py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">مميزات النظام</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            نظام إدارة الوقف © {new Date().getFullYear()} - جميع الحقوق محفوظة
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
