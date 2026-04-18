
الخطة معتمدة بالفعل من المستخدم. سأنفذ موجة P1 الخاطفة بالتوازي الآمن.

## موجة P1 — تصفير الأخطاء

### #1 `useAccountsSettings.ts` — state→useMemo
- حذف 5 `useState` للقيم المشتقة من `appSettings.data` و `currentAccount`
- استبدال `useEffect` للنسخ بـ `useMemo` يشتق مباشرة
- الإبقاء على setters كـ no-op stubs لأن المستخدمين الخارجيين قد يستهلكونها (تحقق سريع قبل الحذف)

### #2 `eqeqeq` — 5 مواضع
- `useAccountsSettings.ts:97` (×2): استخراج متغير محلي + `=== null || === undefined`
- `useAdminDashboardData.ts:59` (×3): نفس النمط

### #3 `preserve-manual-memoization` — 2 مواضع
- `ZatcaHealthPanel.tsx`: استخراج `expiresAt` محلياً قبل `useMemo`
- `useBeneficiaryFinancials.ts`: استخراج `beneficiary` محلياً قبل `useMemo`

### #4 `useMySharePage.ts` — استخراج data hook
- إنشاء `src/hooks/data/contracts/useContractsForPdf.ts` يُصدّر function تأخذ `fiscalYearId`
- تحديث `useMySharePage.ts` لاستهلاكه + حذف import supabase
- تحديث `src/hooks/data/contracts/index.ts` (إن وجد)

## التحقق
- قراءة الملفات المتأثرة قبل التعديل لتأكيد الأنماط الفعلية
- فحص consumers لـ `useAccountsSettings` للتأكد من أن setters غير مستخدمة فعلياً قبل حذفها
- بعد التنفيذ: ESLint على الملفات المعدلة فقط

## الضمانات
- لا تغيير سلوكي — كل القيم المشتقة تبقى متطابقة
- لا لمس لملفات المصادقة أو المحمية
- التزام بـ logger و lib/notify
- توازي آمن: الملفات الأربعة مستقلة
