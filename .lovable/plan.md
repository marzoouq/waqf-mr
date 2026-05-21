## خطة التنفيذ — تحسينات المعمارية (6 مراحل)

تنفيذ توصيات تقرير المراجعة المعمارية خطوة بخطوة، مع الحفاظ التام على المكونات والسلوك الحالي. كل مرحلة مستقلة وقابلة للتراجع.

---

### المرحلة 1 — نقل ملفات utils المرتبطة بـ IO إلى lib/

**الهدف**: تطبيق قاعدة `lib vs utils` — utils تبقى دوال نقية فقط.

- نقل `src/utils/database.ts` → `src/lib/database.ts`
- نقل `src/utils/zatca.ts` → `src/lib/zatca/index.ts` (أو دمجه مع `src/lib/zatca` إن وُجد)
- نقل `src/utils/webAuthnErrors.ts` → `src/lib/auth/webAuthnErrors.ts`
- تحديث جميع الاستيرادات (`rg` ثم استبدال دقيق)
- إبقاء re-export مؤقت من المسار القديم لمنع الكسر إن لزم

**التحقق**: build + 1693 test يجب أن تمر.

---

### المرحلة 2 — توحيد بنية `src/types/`

- دمج `src/types/financial.ts` داخل `src/types/financial/` (كـ `financial/legacy.ts` أو إعادة توزيع)
- نقل `src/types/data/crudFactory.ts` إلى مكان منطقي ضمن نفس المجلد + index موحّد
- تحديث الاستيرادات

**التحقق**: tsc + tests.

---

### المرحلة 3 — تسطيح المجلدات شبه الفارغة

- `src/components/admin/beneficiaries/` → `src/components/beneficiaries/admin/` (أو دمج)
- `src/components/admin/email-monitor/` → `src/components/email-monitor/`
- `src/components/settings/account/AccountTab.tsx` → `src/components/settings/AccountTab.tsx`
- حذف المجلدات الفارغة الناتجة

**التحقق**: استيرادات + tests.

---

### المرحلة 4 — تفكيك Page Hooks الثقيلة

استخراج المنطق الحسابي إلى `src/hooks/domain/financial/`:

- `useCollectionData.ts` (205) → استخراج حسابات التحصيل
- `useIncomePage.ts` (198) → استخراج تجميعات الدخل
- `usePaymentInvoicesTab.ts` (196) → استخراج فلترة الفواتير
- `useInvoicesPage.ts` (191)، `useAccountsPage.ts` (188)، `useExpensesPage.ts` (185)

كل hook يبقى < 180 سطر بعد التفكيك.

**التحقق**: tests + سلوك الصفحات يدوياً.

---

### المرحلة 5 — توضيح حدود `src/lib/hooks/` vs `src/hooks/ui/`

- مراجعة `useNowClock.ts` و `useStableRef.ts`
- نقلهما إلى `src/hooks/ui/` ودمج المجلد، أو توثيق سبب الفصل في README صغير

**التحقق**: استيرادات + tests.

---

### المرحلة 6 — توثيق فقط (بدون migration rollup)

- إضافة ملاحظة في `supabase/migrations/README.md` (إن لم يوجد ننشئه) تشرح سياسة rollup المستقبلية
- **لا rollup فعلي** — مؤجل لنافذة هادئة بقرار صريح من الناظر

---

## ضمانات السلامة

- ❌ لا تعديل على: AuthContext, ProtectedRoute, client.ts, types.ts, config.toml, .env
- ❌ لا migrations لقاعدة البيانات (المراحل 1–5 frontend فقط)
- ❌ لا تغيير في منطق RLS أو Edge Functions
- ✅ كل مرحلة = commit منفصل + اختبارات خضراء
- ✅ بعد كل مرحلة: تشغيل `bunx vitest run` + فحص build

## ترتيب التنفيذ المقترح

أبدأ بالمرحلة **1** (الأقل خطورة، الأعلى قيمة)، ثم انتظر تأكيدك قبل الانتقال للمرحلة التالية، أو نفّذ المراحل 1→5 متتالية ثم تقرير شامل.

**أيهما تفضّل: مرحلة-مرحلة بتأكيد بينها، أم تنفيذ كامل متتالي مع تقرير نهائي؟**  
**تنفيذ كامل متتالي مع تقرير نهائي؟ مع التقيد بعدم الامساس بالمكونات الاخرى وتنفيذ المراحل مرحله مرحله بالكامل وبعدم القفز والحرص على الانتهاء 100% اثناء التنفيذ ومراجعة كل مرحله بعد الانتهاء بشكل صارم ودقيق** 