/** تشغيل حارس كاش PWA بنمط fire-and-forget — لا يمنع الإقلاع عند الفشل */
export function registerPwa(): void {
  import('@/lib/pwaBootstrap')
    .then((m) => m.runPwaCacheGuard())
    .catch(() => {
      /* تجاهل — لا نمنع الإقلاع بسبب PWA */
    });
}
