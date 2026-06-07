# كاتالوج الفحوصات

14 بطاقة × ~50 فحص. كل فحص يُعيد `CheckResult { id, label, status, detail }`.

| البطاقة | عدد الفحوصات | الملف |
|---------|---------------|-------|
| قاعدة البيانات | 3 | `checks/database.ts` |
| المتصفح والأداء | 5 | `checks/performance.ts` |
| التخزين | 6 | `checks/storage.ts` |
| الواجهة والتصميم | 3 | `checks/ui.ts` |
| الأمان والصلاحيات | 2 | `checks/security.ts` |
| إعدادات التطبيق | 3 | `checks/appSettings.ts` |
| ZATCA والفوترة | 7 | `checks/zatca.ts` |
| الفحوصات المالية | 5 | `checks/financial.ts` |
| اتساق بطاقات اللوحات | 6 | `checks/cardConsistency.ts` |
| تدقيق رقمي DB ↔ RPC ↔ UI | 4 | `checks/numericalAudit.ts` |
| التوجيه والمسارات | 3 | `checks/routing.ts` |
| وضع التدقيق (Lighthouse) | 5 | `checks/auditMode.ts` |
| PWA و Service Worker | 3 | `checks/pwa.ts` |
| أخطاء التشغيل | 1 | `checks/runtimeErrors.ts` |

## القيم المرجعية

- **pass**: الفحص نجح
- **warn**: يعمل لكن يحتاج انتباه
- **fail**: مشكلة حقيقية تستوجب إصلاح
- **info**: معلومة بحتة (مثلاً وضع التدقيق غير نشط)
