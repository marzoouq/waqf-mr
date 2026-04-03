/**
 * مكوّن شريط انقطاع الإنترنت — يظهر عند فقدان الاتصال
 */
import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[9998] bg-destructive text-destructive-foreground text-sm font-medium flex items-center justify-center gap-2 py-2 px-4 shadow-lg animate-in slide-in-from-top duration-300"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>لا يوجد اتصال بالإنترنت — بعض الميزات قد لا تعمل</span>
    </div>
  );
}
