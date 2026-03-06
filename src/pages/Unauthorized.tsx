import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldX, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Unauthorized = () => {
  const { role } = useAuth();

  const homePath =
    role === 'admin' || role === 'accountant' ? '/dashboard'
    : role === 'beneficiary' ? '/beneficiary'
    : role === 'waqif' ? '/beneficiary'
    : '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold mb-4">غير مصرح</h1>
        <p className="text-muted-foreground mb-8">
          عذراً، ليس لديك صلاحية للوصول إلى هذه الصفحة
        </p>
        <Link to={homePath}>
          <Button className="gradient-primary gap-2">
            <Home className="w-4 h-4" />
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
