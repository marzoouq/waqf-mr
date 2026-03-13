

## تشغيل الاختبارات

أنا حالياً في **وضع التخطيط (Plan Mode)** الذي لا يسمح بتنفيذ أوامر أو تشغيل اختبارات. 

**للتشغيل:** انتقل إلى **وضع التنفيذ (Default Mode)** وأعد طلب تشغيل الاختبارات، أو شغّلها يدوياً عبر:

```bash
npx vitest run
```

المشروع يحتوي على اختبارات في أكثر من 40 ملف تغطي:
- الـ Hooks (useAccounts, useBeneficiaries, useContracts, etc.)
- الصفحات العامة (Auth, Index, NotFound, etc.)
- المكونات (ExportMenu, Sidebar, TablePagination, etc.)
- الأدوات المساعدة (PDF, maskData, accountsCalculations, etc.)
- اختبارات الأمان (roles-security, edgeFunctionAuth, etc.)

