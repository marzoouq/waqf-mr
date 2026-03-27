

# الجلسة التاسعة — تحسينات إضافية

## النتائج الرئيسية من المراجعة

### 1. تكرار منطق تخصيص العقود (أولوية عالية)
`src/hooks/financial/useAccountsData.ts` (سطور 29–48) يكرر **نفس المنطق بالضبط** الموجود في `useContractAllocationMap.ts`. يجب استبداله باستدعاء الـ hook المشترك.

### 2. تكرار استخلاص بصمة الجهاز في `useSecurityAlerts.ts`
الدالة `getDeviceFingerprint()` (سطر 13) تُنفّذ regex للـ User-Agent، ثم **نفس الـ regex بالضبط** يتكرر داخل `checkNewDeviceLogin` (سطور 49–51) لمعالجة السجلات السابقة. يجب إعادة استخدام `getDeviceFingerprint` بدلاً من تكرار regex.

### 3. ملفات إعادة التصدير (re-export shims) — تنظيف اختياري
يوجد 7 ملفات في `src/hooks/` هي مجرد `export * from './...'` (مثل `useBeneficiaries.ts`, `useAppSettings.ts`). هذه مقبولة للتوافقية الخلفية لكن يمكن إزالتها تدريجياً إذا تم تحديث جميع المستوردين.

### 4. `format.ts` — إضافة `fmtDate` المفقود
الملف `src/utils/format.ts` (37 سطر) يحتوي على `fmt`, `fmtInt`, `fmtSAR`, `fmtPct` لكن **لا يوجد `fmtDate`**. تنسيق التواريخ مبعثر في المكونات. إضافة دالة موحّدة ستقلل التكرار.

---

## خطة التنفيذ

### المهمة 1: استبدال تكرار allocationMap في `useAccountsData.ts`
- حذف `useMemo` المكرر (سطور 28–48)
- استيراد واستخدام `useContractAllocationMap(allContracts)`
- حذف استيراد `allocateContractToFiscalYears` غير المستخدم

### المهمة 2: إصلاح تكرار regex في `useSecurityAlerts.ts`
- استخراج الـ regex إلى دالة مساعدة `extractFingerprint(ua: string)`
- استخدامها في كلا الموضعين (سطر 13–18 وسطر 47–52)

### المهمة 3: إضافة `fmtDate` إلى `format.ts`
- دالة `fmtDate(date: string | null | undefined): string` تُنسّق التاريخ بصيغة `YYYY/MM/DD` أو هجري حسب الإعدادات
- صيغة بسيطة: `new Date(date).toLocaleDateString('en-CA')` كقيمة افتراضية

### المهمة 4: تنظيف re-export shims (اختياري)
- البحث عن كل المستوردين لكل ملف shim
- تحديث المسارات لتشير مباشرة إلى الملف الأصلي
- حذف ملفات الـ shim

---

## التفاصيل التقنية

| الملف | التغيير | الأثر |
|-------|---------|-------|
| `useAccountsData.ts` | استبدال 20 سطر بـ 2 سطر | إزالة تكرار منطقي |
| `useSecurityAlerts.ts` | استخراج دالة مشتركة | إزالة تكرار regex |
| `format.ts` | إضافة `fmtDate` + `fmtDateHijri` | توحيد تنسيق التواريخ |
| 7 ملفات shim | حذف بعد تحديث المستوردين | تبسيط الهيكل |

