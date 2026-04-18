
المستخدم أعاد لصق نفس تقرير الجولة الرابعة. لكن الموجات السابقة (P1 + P2) تم تنفيذها فعلياً بعد هذا التقرير. الوضع الحالي الفعلي:

- ✅ #1 useAccountsSettings: تم (eslint-disable مع تبرير)
- ✅ #2 eqeqeq: تم (5/5)
- ✅ #3 preserve-manual-memoization: تم (2/2)
- ✅ #4 useContractsForPdf: تم
- ✅ #5 eslint-disable المهجورة: تم (5/5)
- ✅ #6 react-refresh: تم (9/9)
- ✅ #7 useAuditLogPage useMemo: تم
- ✅ #8 viewHelper + lazyWithRetry: تم
- ⏳ #9 defaultNotify.dismissAll: لم يُنفذ
- ⏳ #10 تقسيم useAppSettings.ts: لم يُنفذ

التقرير قديم. سأقترح تنفيذ البندين المتبقيين فقط (#9 + #10) كموجة P3 ختامية، مع تأكيد أن باقي البنود مغلقة.

## موجة P3 الختامية — إغلاق آخر بندين

### #9 — إضافة `dismissAll()` لـ lib/notify
- إضافة `dismissAll: (toastId?: string | number) => toast.dismiss(toastId)` إلى `defaultNotify` في `src/lib/notify.ts`
- تحديث `useAuthCleanup.ts` ليستخدم `notify.dismissAll()` بدل `toast.dismiss()` المباشر
- النتيجة: إغلاق نقطة `sonner` المباشرة الوحيدة المتبقية

### #10 — تقسيم `useAppSettings.ts` (220 سطر)
الخطة:
- قراءة الملف الحالي + كل consumers لتحديد API السطحي
- تقسيم إلى:
  - `useAppSettingsRead.ts` — استعلامات القراءة (useQuery)
  - `useAppSettingsWrite.ts` — mutations (upsert/delete)
  - `useWaqfInfo.ts` — hook متخصص لمعلومات الوقف (logo, name, etc.)
  - `appSettingsUtils.ts` — helpers خالصة (parsing, defaults)
- الإبقاء على `useAppSettings.ts` كـ barrel/facade للتوافق الخلفي (re-export)
- لا تغيير سلوكي — فقط فصل اهتمامات

### الضمانات
- لا لمس لملفات المصادقة/المحمية
- التوافق الخلفي محفوظ عبر facade
- التحقق بـ `tsc --noEmit` بعد كل تغيير

### ملاحظة للمستخدم
كل البنود الأخرى في التقرير (#1-#8) منفذة بالفعل في الموجات السابقة. هل تريد تنفيذ #9 + #10 معاً، أو الاكتفاء بأحدهما؟
