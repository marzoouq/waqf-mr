import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldX, Home, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Unauthorized = () => {
  const { role } = useAuth();

  const homePath =
    role === 'admin' || role === 'accountant' ? '/dashboard'
    : role === 'beneficiary' ? '/beneficiary'
    : role === 'waqif' ? '/waqif'
    : '/';

  return (
    <main dir="rtl" className="min-h-screen bg-background flex flex-col">
      {/* Hero header */}
      <div className="gradient-primary py-10">
        <div className="container mx-auto px-4 text-center">
          <Link to={homePath} className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shadow-gold">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-primary-foreground">نظام إدارة الوقف</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">غير مصرح بالدخول</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            عذراً، ليس لديك الصلاحية اللازمة للوصول إلى هذه الصفحة.
            إذا كنت تعتقد أن هذا خطأ، تواصل مع ناظر الوقف.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={homePath}>
              <Button className="gradient-primary gap-2 rounded-xl px-6">
                <Home className="w-4 h-4" />
                العودة للرئيسية
              </Button>
            </Link>
            <Button variant="outline" className="gap-2 rounded-xl px-6" onClick={() => window.history.back()}>
              <ArrowRight className="w-4 h-4" />
              الصفحة السابقة
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center border-t">
        <p className="text-xs text-muted-foreground">
          نظام إدارة الوقف © {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
};

export default Unauthorized;
