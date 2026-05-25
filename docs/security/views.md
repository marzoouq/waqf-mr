# Public Views — Security Posture

آخر تحديث: 2026-05-25

## نظرة عامة

كل العروض في schema `public` تستخدم `security_invoker=on` افتراضياً، باستثناء `contracts_safe` — وهو **استثناء معماري موثّق** بضمانات داخلية صارمة.

| العرض | `security_invoker` | المبرر |
|---|---|---|
| `beneficiaries_safe` | `on` | يعتمد على RLS الخاص بـ `beneficiaries`. |
| `v_fiscal_year_summary` | `on` | يعتمد على RLS الخاص بـ `fiscal_years`. |
| `zatca_certificates_safe` | `on` | يعتمد على RLS الخاص بـ `zatca_certificates`. |
| `contracts_safe` | **`off` (مقصود)** | يفرض ضوابط دور + فلترة سنة مالية + إخفاء PII داخل العرض نفسه. |

## `contracts_safe` — الاستثناء المقصود

### السبب
- الجدول الأصلي `contracts` يحتوي حقول حساسة (PII المستأجر).
- المستفيد والواقف يحتاجون قراءة بيانات العقود غير الحساسة ضمن السنوات المالية المسموح بها.
- المحاسب والناظر يحتاجون رؤية كاملة.
- استخدام `security_invoker=on` يجبرنا على نسخ منطق الإخفاء/الفلترة في كل استعلام client-side — غير آمن وغير قابل للصيانة.

### الضوابط داخل العرض
1. `WITH (security_invoker = off, security_barrier = true)` — يمنع تسريب predicates إلى الـ planner.
2. `WHERE auth.uid() IS NOT NULL` — يرفض أي وصول مجهول.
3. فلترة سطرية: غير الناظر/المحاسب يرى فقط `is_fiscal_year_accessible(c.fiscal_year_id)`.
4. إخفاء PII: لغير الناظر/المحاسب → `tenant_name='***'` وكل بقية حقول هوية المستأجر والعنوان والملاحظات = `NULL`.
5. صلاحيات قاعدة البيانات:
   - `REVOKE ALL FROM PUBLIC, anon, authenticated`.
   - `GRANT SELECT TO authenticated, service_role` فقط — لا INSERT/UPDATE/DELETE لأي دور.

### الـ Linter
يولّد Supabase Linter تنبيه `0010_security_definer_view` لهذا العرض. تم وضعه كـ **ignored finding** مع رابط لهذه الوثيقة. أي تعديل مستقبلي على العرض يجب أن يحافظ على الضوابط الخمسة أعلاه.

### اختبارات
- `src/test/contractsSafeAccess.test.ts` (Vitest) — يتحقق من سلوك التغليف على mocks.
- تحقق SQL مباشر بعد كل migration:
  ```sql
  SELECT reloptions FROM pg_class WHERE relname='contracts_safe';
  SELECT has_table_privilege('anon','public.contracts_safe','SELECT');        -- false
  SELECT has_table_privilege('authenticated','public.contracts_safe','SELECT'); -- true
  SELECT has_table_privilege('authenticated','public.contracts_safe','INSERT'); -- false
  ```

## مرجع
- [Supabase Linter 0010](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- `mem://security/storage/waqf-assets-public-bucket-rationale`
- `docs/security/security-definer-allowlist.md`
