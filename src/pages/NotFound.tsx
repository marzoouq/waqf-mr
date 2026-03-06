import { useLocation, Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { logger } from '@/lib/logger';

const NotFound = () => {
  const location = useLocation();
  const loggedPaths = useRef(new Set<string>());

  useEffect(() => {
    // Rate limit: log each unique path only once per session
    if (loggedPaths.current.has(location.pathname)) return;
    loggedPaths.current.add(location.pathname);
    logger.warn("404: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted" dir="rtl">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">٤٠٤</h1>
        <p className="mb-4 text-xl text-muted-foreground">عذراً! الصفحة غير موجودة</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
