import { Link } from "react-router-dom";
import { Building2, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <main dir="rtl" className="min-h-screen bg-background flex flex-col">
      {/* Hero header */}
      <div className="gradient-primary py-10">
        <div className="container mx-auto px-4 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
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
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-12 h-12 text-muted-foreground/60" />
          </div>
          <h1 className="text-6xl font-display font-bold text-foreground mb-3">٤٠٤</h1>
          <p className="text-xl font-bold text-foreground mb-2">الصفحة غير موجودة</p>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها. ربما تم نقلها أو حذفها.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/">
              <Button className="gradient-primary gap-2 rounded-xl px-6">
                <Home className="w-4 h-4" />
                الصفحة الرئيسية
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" className="gap-2 rounded-xl px-6">
                تسجيل الدخول
              </Button>
            </Link>
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

export default NotFound;
