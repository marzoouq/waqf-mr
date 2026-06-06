/**
 * مكوّن تحميل عام — يُستخدم كـ Suspense fallback
 */
export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
