import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, FileText, Home } from 'lucide-react';

/**
 * فوتر موحد لصفحات سياسة الخصوصية وشروط الاستخدام
 * يعرض روابط التنقل بين الصفحتين + رابط الرئيسية
 */
const LegalPageFooter = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isPrivacy = pathname === '/privacy';

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Cross-links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="gap-2 rounded-xl"
          >
            <Home className="w-4 h-4" />
            الصفحة الرئيسية
          </Button>
          {isPrivacy ? (
            <Button
              onClick={() => navigate('/terms')}
              variant="ghost"
              className="gap-2 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <FileText className="w-4 h-4" />
              شروط الاستخدام
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/privacy')}
              variant="ghost"
              className="gap-2 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <Shield className="w-4 h-4" />
              سياسة الخصوصية
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          نظام إدارة الوقف © {new Date().getFullYear()} — جميع الحقوق محفوظة
        </p>
      </div>
    </footer>
  );
};

export default LegalPageFooter;
