
## تنفيذ B2 — رفع staleTime لقوائم السجل التاريخية

### النتيجة بعد التحقق
- **B1 (ORDER BY):** كل الاستعلامات الـ 5 (`useAccessLogTab` × 3، `useAuditLog`، `useClientErrors`، `useArchiveLog`) تستخدم `.order('created_at', { ascending: false })` بالفعل. **لا تغيير مطلوب** — الفهارس من الموجة 1 ستُستخدم تلقائياً عند النشر.
- **B2:** ثابت staleTime الحالي `STALE_MESSAGING = 30s` يُستخدم للرسائل والسجل معاً. الرسائل تحتاج تحديثاً سريعاً، السجل لا. سأفصلهما.

### التغييرات (6 ملفات فقط)

**1) `src/lib/queryStaleTime.ts`** — إضافة ثابت جديد:
```ts
/** سجلات تاريخية (audit/access_log) — لا تتغير لحظياً */
export const STALE_AUDIT = 2 * 60_000;
```

**2-6) استبدال `STALE_MESSAGING` بـ `STALE_AUDIT` في 5 هوكات سجل:**
- `src/hooks/data/audit/useAccessLogTab.ts` (3 استعلامات)
- `src/hooks/data/audit/useAuditLog.ts`
- `src/hooks/data/audit/useClientErrors.ts`
- `src/hooks/data/audit/useArchiveLog.ts`
- `src/hooks/data/audit/useAuditLogStats.ts` (`useAuditLogTodayCount` فقط)

`STALE_MESSAGING` يبقى للرسائل/المحادثات/تذاكر الدعم (التي تحتاج 30s).

### المكسب المتوقع
- استدعاءات `access_log` و`audit_log` تنخفض ~75% (من كل 30s إلى كل 2m)
- توفير ~30 ثانية CPU / فترة قياس
- لا أثر على بيانات حية (السجلات تاريخية)

### المخاطر
- صفر — السجلات لا تُعدّل بعد إنشائها (RLS `USING(false)` للحذف/التعديل)
- في حال إضافة سجل جديد، يظهر خلال دقيقتين كحد أقصى

### التحقق
- `bunx tsgo --noEmit` + `bunx vitest run` بعد التطبيق
