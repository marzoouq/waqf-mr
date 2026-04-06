import { Skeleton } from '@/components/ui/skeleton';

/**
 * هيكل تحميل مخصص لصفحة Auth — يحاكي شكل البطاقة الحقيقية
 */
export default function AuthSkeleton() {
  return (
    <div className="min-h-screen gradient-auth pattern-islamic-strong flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-xs shadow-elegant p-6 space-y-5">
          {/* الشعار */}
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* التبويبات */}
          <Skeleton className="h-11 w-full rounded-lg" />

          {/* حقول النموذج */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
          </div>

          {/* زر الإرسال */}
          <Skeleton className="h-11 w-full rounded-md" />
        </div>

        {/* زر التثبيت */}
        <Skeleton className="h-10 w-full rounded-md mt-4" />
      </div>
    </div>
  );
}
