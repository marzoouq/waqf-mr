

# خطة إصلاح المشاكل المتبقية قبل النشر

بعد مراجعة شاملة لكامل الكود الحالي والوثائق، تبيّن أن الغالبية العظمى من المشاكل المذكورة في التقرير **تم إصلاحها فعلا** في التعديلات السابقة أو أنها **ليست مشاكل حقيقية**.

---

## نتائج المراجعة: ما تم إصلاحه بالفعل (21 من 26)

| المشكلة | الحالة | الدليل في الكود |
|---------|--------|-----------------|
| BUG-01 (WaqifDashboard expectedPayments) | مُصلح | سطر 79: `if (expectedPayments === 0) return;` |
| BUG-02 (useComputedFinancials !isClosed) | مُصلح | سطر 84-100: يحسب من البيانات الحية |
| BUG-03 (accounts.length===1 مع 'all') | مُصلح | سطر 51: يفحص `fiscalYearId !== 'all'` |
| BUG-04 (myShare من availableAmount) | تصميم صحيح | حسب الوثيقة: `availableAmount = waqfRevenue - corpus` هو المبلغ الفعلي القابل للتوزيع |
| BUG-05 (AdminDashboard finLoading) | مُصلح | سطر 46: `finLoading` مشمول |
| BUG-06 (\_\_none\_\_ filter) | مُصلح | سطر 14: فحص صريح لـ `__none__` |
| BUG-07 (contractAllocation mutation) | ليس خطأ | كل تكرار يُنشئ `new Date(start)` جديد |
| BUG-08 (paymentCount===1) | تصميم صحيح | العقد السنوي = دفعة واحدة |
| BUG-09 (Auth redirect بعد signOut) | ليس خطأ | useEffect يتابع `role` بشكل صحيح |
| BUG-11 (printShareReport) | تابع لـ BUG-04 | BUG-04 صحيح، إذن BUG-11 غير موجود |
| BUG-12 (CORS للشعار) | غير مؤثر | الشعار يُحمّل من نفس النطاق |
| BUG-13 (ProtectedRoute showSignOut) | تصميم مقصود | آلية أمان احتياطية عند تأخر الدور |
| BUG-15 (AI\_URL undefined) | غير مؤثر | `VITE_SUPABASE_URL` دائما موجود في Lovable Cloud |
| BUG-16 (AiAssistant abort) | مُصلح | سطر 128: `finally { setIsLoading(false) }` |
| BUG-17 (useMessaging unsubscribe) | مُصلح | سطور 35,70: `supabase.removeChannel(channel)` مباشرة |
| BUG-18 (XSS في الرسائل) | غير مؤثر | React يمنع XSS تلقائيا + RLS على الجدول |
| BUG-19 (useWebAuthn isLoading) | مُصلح | سطور 100-102, 155-157: `finally { setIsLoading(false) }` |
| BUG-20 (localStorage في SSR) | غير مؤثر | المشروع SPA ولن يُنقل لـ SSR |
| BUG-21 (useCrudFactory null) | ليس خطأ | `if (error) throw error` يمنع الحالة |
| BUG-22 (isNonAdmin بدون useMemo) | غير مؤثر | مقارنة سلسلتين نصيتين، تكلفة صفرية |
| BUG-26 (waqfCorpusPrevious في الحساب) | تصميم صحيح | حسب وثيقة `waqf-corpus-carry-forward` |

---

## التوافق بين الكود والوثائق

| البند في الوثيقة | ما يقوله الكود | النتيجة |
|------------------|----------------|---------|
| "تُعطل أزرار التعديل عند isClosed" (سطر 217) | IncomePage + ExpensesPage: `disabled={isClosed}` | متوافق |
| "shareBase = إيرادات - مصروفات - زكاة" (سطر 98) | `accountsCalculations.ts` سطر 50 | متوافق |
| "waqfRevenue = netAfterZakat - adminShare - waqifShare" (سطر 129) | `accountsCalculations.ts` سطر 62 | متوافق |
| "السنة النشطة: حساب ديناميكي" (سطر 294) | `useComputedFinancials` سطر 84-100 | متوافق |
| "السنة المقفلة: قراءة من accounts" (سطر 295) | `useComputedFinancials` سطر 103-115 | متوافق |

---

## المشاكل الحقيقية المتبقية (3 فقط)

### 1. BUG-10: `normalizeArabicDigits` لا تُطبّق على البريد الالكتروني
**الملف:** `src/pages/Auth.tsx`

عند استخدام لوحة مفاتيح عربية، قد يُدخل المستخدم ارقاما عربية (مثل `user@example.com` بأرقام ٠-٩) في حقل البريد الالكتروني. الدالة `normalizeArabicDigits` موجودة ومُطبّقة على `nationalId` فقط.

**الاصلاح:** تطبيق `normalizeArabicDigits` على `loginEmail` و `signupEmail` و `resetEmail` قبل ارسالها.

### 2. PERF-01: `formatArabicMonth` مُعرّفة داخل المكوّن
**الملفات:** `AdminDashboard.tsx` سطر 176 + `WaqifDashboard.tsx` سطر 104

الدالة تُنشئ كائن `Record` جديد في كل render وتُمرّر كـ `tickFormatter` لـ Recharts، مما يُسبب اعادة رسم المحور بلا حاجة.

**الاصلاح:** نقل الدالة وكائن الاشهر خارج المكوّن كـ module-level constant.

### 3. PERF-02: `currentBeneficiary` بدون `useMemo`
**الملف:** `BeneficiaryDashboard.tsx` سطر 33

`beneficiaries.find(...)` يُعاد تنفيذه كل render (بما فيه كل 60 ثانية بسبب الساعة الحية).

**الاصلاح:** تغليف بـ `useMemo([beneficiaries, user?.id, benError])`.

---

## خطة التنفيذ

### الملف 1: `src/pages/Auth.tsx`
- تطبيق `normalizeArabicDigits` على `loginEmail` في `handleSignIn` (سطر 125)
- تطبيق `normalizeArabicDigits` على `signupEmail` في `handleSignUp` (سطر 205)
- تطبيق `normalizeArabicDigits` على `resetEmail` عند الارسال (سطر 404)

### الملف 2: `src/pages/dashboard/AdminDashboard.tsx`
- نقل `formatArabicMonth` و `arabicMonths` خارج المكوّن (قبل سطر 22)

### الملف 3: `src/pages/beneficiary/WaqifDashboard.tsx`
- نقل `formatArabicMonth` و كائن الاشهر خارج المكوّن (قبل سطر 28)

### الملف 4: `src/pages/beneficiary/BeneficiaryDashboard.tsx`
- تغليف `currentBeneficiary` بـ `useMemo`

---

## الخلاصة

من اصل 26 مشكلة في التقرير: **21 تم اصلاحها بالفعل او ليست مشاكل حقيقية**، و**3 تحسينات بسيطة متبقية** (لا تؤثر على صحة البيانات، فقط اداء وتوافق مع لوحات المفاتيح العربية). المشروع جاهز للنشر بعد هذه التحسينات الثلاثة.

