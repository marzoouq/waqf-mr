# دليل التشخيص — نظرة عامة

نظام التشخيص الكامل لتطبيق وقف مرزوق بن علي الثبيتي.

## المكونات

| المكوّن | المسار | الغرض |
|---------|--------|-------|
| Overlay وضع التدقيق | `src/components/diagnostics/AuditModeOverlay.tsx` | عرض حي لإشارات `?audit=1` |
| مركز التشخيص | `/dashboard/diagnostics` | 14 بطاقة × ~50 فحص مع عدّاد |
| جامع أخطاء التشغيل | `src/lib/diagnostics/runtimeCollector.ts` | يلتقط window.error إلى sessionStorage |
| محرّك الفحص | `src/lib/diagnostics/checks.ts` | `runAllDiagnostics({ onProgress })` |
| `getSwRefusalReason()` | `src/lib/pwaBootstrap.ts` | سبب رفض SW المعروض في الشاشة |

## الأدلة

- [دليل DevTools و Lighthouse](./devtools-lighthouse-guide.md)
- [أعلام URL للتحكم](./audit-mode-flags.md)
- [كاتالوج الفحوصات](./check-catalog.md)
- [إضافة فحص جديد](./adding-new-check.md)
- [دليل استكشاف الأخطاء](./troubleshooting-playbook.md)
- [دمج CI (مستقبلًا)](./ci-integration.md)
