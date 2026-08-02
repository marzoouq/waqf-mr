/**
 * IpBlockGuard — يمنع استخدام التطبيق من عنوان IP محجوب.
 * يفحص الحجب مرة عند الإقلاع وكل 5 دقائق، ويعرض شاشة كاملة عند الحجب.
 */
import { useEffect, useState } from 'react';
import { ShieldOff } from 'lucide-react';
import { resolveClientContext } from '@/lib/monitoring/clientContext';
import { useAuth } from '@/hooks/auth/session/useAuthContext';

const CHECK_INTERVAL_MS = 5 * 60_000;

export default function IpBlockGuard() {
  const { signOut } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async (force: boolean) => {
      const ctx = await resolveClientContext(force);
      if (cancelled) return;
      setBlocked(ctx.blocked);
      setReason(ctx.blockReason);
      if (ctx.blocked) {
        try { await signOut(); } catch { /* noop */ }
      }
    };

    void check(false);
    const timer = window.setInterval(() => void check(true), CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [signOut]);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md text-center space-y-4">
        <ShieldOff className="h-14 w-14 mx-auto text-destructive" />
        <h1 className="text-2xl font-bold">تم إيقاف الوصول من هذا الجهاز</h1>
        <p className="text-muted-foreground">
          رُصد نشاط غير معتاد من عنوان الشبكة الخاص بك، وتم إيقافه مؤقتاً لحماية النظام.
        </p>
        {reason && <p className="text-sm text-muted-foreground">السبب: {reason}</p>}
        <p className="text-sm text-muted-foreground">
          يمكن لناظر الوقف فتح الوصول من لوحة التحكم — تواصل مع الإدارة للمتابعة.
        </p>
      </div>
    </div>
  );
}
