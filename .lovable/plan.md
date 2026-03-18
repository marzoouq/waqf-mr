

## الفحص الجنائي — الجولة العاشرة (تقرير الهوكات والبنية التحتية: 17 بنداً)

### التحقق بند بند مقابل الكود الفعلي

| # | البند | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|-------------------|--------|
| **SEC-1** | `.env` مرفوع في الـ repo | **❌ غير صحيح** — `.gitignore` سطر 27: `.env` مُدرج. الملف الموجود هو ملف **Lovable Cloud المُولَّد تلقائياً** (يحتوي على `VITE_` publishable keys فقط). هذه مفاتيح عامة (anon key) مصممة للتضمين في الـ frontend build. لا يوجد خطر أمني | لا |
| **SEC-2** | لا role check قبل `pay_invoice` RPC | **❌ بالتصميم** — RPC `pay_invoice_and_record_collection` هي `SECURITY DEFINER` مع تحقق داخلي. سياسات RLS على `payment_invoices` تسمح فقط لـ admin/accountant بالتعديل. المستفيد لا يملك صلاحية `ALL` على الجدول → RPC محمية | لا |
| **SEC-3** | `limit: 1000` بدون pagination | **🟡 موثق** — محدودية معروفة ومُدارة عبر toast warning. الحلول البديلة (cursor pagination) تتطلب إعادة بناء كل الهوكات. `useCrudFactory` يُستخدم لجداول صغيرة (properties, units, expenses) | لا (DEFER-31) |
| **BUG-P** | رسائل محدودة بـ 50 بلا load more | **✅ مؤكد** — سطر 59: `.limit(50)` + `.reverse()`. لا يوجد infinite scroll. المحادثات الطويلة تفقد الرسائل القديمة | لا (DEFER-32) — تغيير UX كبير |
| **BUG-Q** | `p_payment_date = undefined` → NULL | **✅ مؤكد جزئياً** — سطر 57: `?? undefined`. Supabase JS client يُسقط `undefined` params (لا تُرسل). الدالة DB تستخدم `COALESCE(p_payment_date, CURRENT_DATE)` → تسقط على تاريخ اليوم. **سلوك صحيح فعلياً** | لا |
| **BUG-R** | `'all'` يجلب 1000 فقط | **✅ مؤكد** — سطر 38: `query.limit(1000)`. لكن `PER_FY_LIMIT = 2000` للسنة الواحدة (سطر 36). عند `'all'`: الحد أقل (1000 vs 2000). **تناقض بسيط** لكن عملياً نادراً ما يتجاوز إجمالي الإيرادات 1000 سجل | **نعم** (بسيط — توحيد الحد) |
| **BUG-S** | ملفات Storage يتيمة | **✅ مؤكد** — سطر 157-158: `catch` يُسجّل تحذيراً فقط. لا cleanup job. **لكن**: حالة نادرة (فشل Storage API) ولا تتراكم بسرعة | لا (DEFER-33) |
| **BUG-T** | `useAccountByFiscalYear` بـ label fallback | **🟡 مقبول** — سطر 37-43: `fiscalYearId` يأخذ الأولوية. `fiscalYearLabel` fallback يُستخدم فقط من كود قديم. كل الاستدعاءات الحالية تُمرر `fiscalYearId` | لا |
| **BUG-U** | `generate_contract_invoices` لا يُبطل contracts | **✅ مؤكد** — سطر 72: يُبطل `payment_invoices` فقط | **نعم** |
| **CODE-1** | `queryClientRef2` اسم مضلل | **✅ مؤكد** — سطر 67. اسم غير واضح | **نعم** |
| **CODE-2** | `toast.warning` في كل background refetch | **✅ مؤكد** — سطر 76. `queryFn` تُستدعى في background → toast يظهر كل staleTime | **نعم** |
| **CODE-3** | رد التذكرة لا يُبطل `support_tickets` | **✅ مؤكد** — سطر 157: يُبطل `ticket_replies` فقط | **نعم** |
| **CODE-4** | حذف الوحدة لا يُبطل contracts | **✅ مؤكد** — سطر 69-70. **لكن** DB FK يمنع حذف وحدة مرتبطة بعقد → الحذف سيفشل أصلاً. الـ invalidation غير ضروري | لا |
| **IMPROVE-1** | لا يوجد ErrorBoundary | **❌ خاطئ تماماً** — `ErrorBoundary.tsx` موجود (136 سطر) ومُستخدم 5+ مرات في `App.tsx` (سطور 127, 134, 194, 199, 204) | لا |
| **IMPROVE-2** | `invalidateQueries exact:false` غير ضروري | **🟡 مقبول** — `exact: false` هو الافتراضي. يُبطل كل queries تبدأ بنفس المفتاح = سلوك React Query المتوقع | لا |
| **IMPROVE-3** | `staleTime: 60s` لتقرير سنوي | **✅ مؤكد** — سطر 132: `staleTime: 60_000`. التقرير السنوي يتغير نادراً | **نعم** |
| **IMPROVE-4** | `notifyUser` خارج transaction | **🟡 مقبول** — سطر 99-110: الإشعار يُرسل **بعد** نجاح `messages.insert` (سطر 96: `if (error) throw error`). الترتيب صحيح: إرسال ← تحديث → إشعار. فشل الإشعار لا يؤثر على الرسالة | لا |

---

### الإصلاحات المطلوبة — 6 تغييرات في 5 ملفات

#### الملف 1: `src/hooks/usePaymentInvoices.ts`
**BUG-U**: إضافة invalidation لـ `['contracts']` في `useGenerateContractInvoices.onSuccess`

#### الملف 2: `src/hooks/useMessaging.ts`
**CODE-1**: تغيير `queryClientRef2` إلى `queryClientRef`

#### الملف 3: `src/hooks/useCrudFactory.ts`
**CODE-2**: نقل `toast.warning` ليظهر مرة واحدة فقط باستخدام flag أو `onSuccess` callback بدل داخل `queryFn`. الأسلوب الأبسط: استخدام متغير closure لمنع التكرار

#### الملف 4: `src/hooks/useSupportTickets.ts`
**CODE-3**: إضافة `qc.invalidateQueries({ queryKey: ['support_tickets'] })` في `onSuccess`

#### الملف 5: `src/hooks/useIncome.ts`
**BUG-R**: توحيد حد `'all'` ليكون `PER_FY_LIMIT` (2000) بدل 1000

#### الملف 6: `src/hooks/useAnnualReport.ts`
**IMPROVE-3**: رفع `staleTime` لـ `useReportStatus` إلى `300_000` (5 دقائق)

---

### بنود مؤجلة

| # | البند | الأولوية |
|---|-------|---------|
| DEFER-31 | Cursor pagination لـ useCrudFactory | منخفضة |
| DEFER-32 | Infinite scroll للرسائل | متوسطة |
| DEFER-33 | Cleanup job لملفات Storage اليتيمة | منخفضة |

---

### ملخص

- **6 ملفات** تُعدَّل (5 hooks + 1 income)
- لا تغييرات DB
- من أصل 17 بنداً: **6 للإصلاح**, **3 مؤجلة**, **8 مدحوضة/بالتصميم**
- أبرز المدحوضات: **SEC-1** (`.env` هو ملف Lovable Cloud بمفاتيح عامة)، **IMPROVE-1** (`ErrorBoundary` موجود ومُستخدم 5 مرات)

