## خطة: مركز أرشفة الوثائق — النسخة النهائية المحققة

**الهدف:** صفحة في لوحة الناظر لإدارة وثائق الوقف الرسمية + صفحة قراءة للمستفيدين والواقف.
**القرارات المعتمدة:** 6 تصنيفات ثابتة · منشورة افتراضياً · PDF فقط ≤ 10MB.

---

### تصحيحات إضافية بعد الفحص الثاني

| # | الادعاء السابق | الواقع | الحل |
|---|----------------|--------|------|
| 6 | تسجيل المشاهدة في `audit_log` بنوع `document_viewed` | `audit_log` schema صارم: `table_name`, `operation`, `record_id`, `old_data`, `new_data` فقط — لا يقبل أنواعاً حرّة | **حذف تسجيل المشاهدة من MVP** (مؤجَّل لموجة لاحقة بجدول مخصص) |
| 7 | "إضافة قسم `archive` لـ useSectionsVisibility" — مبهم | المصدر الحقيقي: `defaultAdminSections` و `defaultBeneficiarySections` في `src/constants/navigation.ts` + `PROTECTED_ADMIN_SECTIONS` في `src/constants/sections.ts` | تحديث `navigation.ts` (إضافة `archive: true`) — **بدون** إضافته لـ `PROTECTED_ADMIN_SECTIONS` (نسمح للناظر بإخفائه) |
| 8 | المحاسب accountant سيرى زر الحذف ويفشل بـ RLS صامتاً | RLS يقصر الكتابة على admin فقط، لكن الواجهة لا تخفي الأزرار | في `ArchiveDocumentCard` و `ArchivePage`: استخدام `useAuth().role === 'admin'` لإخفاء أزرار رفع/تعديل/حذف عن المحاسب (المحاسب قراءة فقط) |

---

### A) قاعدة البيانات

#### A1 — جدول `archived_documents` + RLS (migration واحد، بترتيب GRANT-then-RLS)

```sql
CREATE TABLE public.archived_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description     text CHECK (description IS NULL OR char_length(description) <= 500),
  category        text NOT NULL CHECK (category IN (
    'meeting_minutes','annual_reports','certificates',
    'official_contracts','correspondence','other'
  )),
  storage_path    text NOT NULL UNIQUE,
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  mime_type       text NOT NULL DEFAULT 'application/pdf' CHECK (mime_type = 'application/pdf'),
  document_date   date,
  is_published    boolean NOT NULL DEFAULT true,
  uploaded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.archived_documents TO authenticated;
GRANT ALL ON public.archived_documents TO service_role;

ALTER TABLE public.archived_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_archived_docs_cat_pub_date
  ON public.archived_documents (category, is_published, document_date DESC NULLS LAST, created_at DESC);

CREATE TRIGGER trg_archived_docs_updated_at
  BEFORE UPDATE ON public.archived_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- قراءة: ناظر/محاسب يرون الكل
CREATE POLICY archived_docs_select_admin ON public.archived_documents
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'accountant'::app_role));

-- قراءة: مستفيد/واقف فقط المنشور
CREATE POLICY archived_docs_select_published ON public.archived_documents
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND (has_role(auth.uid(),'beneficiary'::app_role) OR has_role(auth.uid(),'waqif'::app_role))
  );

-- كتابة: ناظر فقط
CREATE POLICY archived_docs_insert_admin ON public.archived_documents
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY archived_docs_update_admin ON public.archived_documents
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY archived_docs_delete_admin ON public.archived_documents
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
```

#### A2 — Storage bucket `waqf-documents` (private)

- إنشاء عبر `supabase--storage_create_bucket(name='waqf-documents', public=false)`.
- سياسات `storage.objects` (migration منفصل):
  - SELECT ناظر/محاسب: كل ملفات `bucket_id='waqf-documents'`.
  - SELECT مستفيد/واقف: فقط الملفات التي يطابق `name` لها `storage_path` لوثيقة `is_published=true` (`EXISTS` على `archived_documents`).
  - INSERT/UPDATE/DELETE: admin فقط.
- مسار الملف: `archive/{uuid}.pdf`.
- المعاينة/التنزيل عبر `createSignedUrl(60s)` فقط — لا public URLs.

---

### B) الواجهة الأمامية

#### B1 — ملفات جديدة (16 ملف)

```text
src/types/archive.ts                    — ARCHIVE_CATEGORIES + ArchivedDocument types
src/utils/format/fileSize.ts            — formatBytes(bytes) — لا توجد حالياً
src/lib/queryKeys/archiveKeys.ts        — { all, list(filters), byId }

src/hooks/data/archive/
  useArchivedDocuments.ts               — قائمة + فلترة (staleTime: STALE_STATIC=5min)
  useArchivedDocumentMutations.ts       — upload / update / togglePublish / delete
  useArchivedDocumentSignedUrl.ts       — signed URL on-demand (TTL 60s)

src/hooks/page/admin/management/useArchivePage.ts
src/hooks/page/beneficiary/useArchiveViewPage.ts

src/components/archive/
  ArchiveUploadDialog.tsx               — Zod (title 3-200, category, PDF ≤10MB)
  ArchiveDocumentCard.tsx               — يخفي أزرار الكتابة عن غير admin
  ArchiveDocumentList.tsx               — شبكة + skeleton + empty state
  ArchiveFilters.tsx                    — Tabs الفئات + بحث
  ArchiveEditDialog.tsx                 — ميتاداتا فقط (بدون استبدال الملف)
  ArchiveDeleteDialog.tsx               — تأكيد + حذف storage + row
  ArchivePdfPreviewDialog.tsx           — iframe(signedUrl)

src/pages/dashboard/ArchivePage.tsx              — لوحة الناظر/المحاسب
src/pages/beneficiary/ArchiveViewPage.tsx         — مستفيد/واقف (قراءة فقط)
```

#### B2 — تدفّق الرفع (atomic + rollback)

1. تحقق Zod محلي (نوع/حجم/طول).
2. `supabase.storage.from('waqf-documents').upload('archive/{uuid}.pdf', file, { contentType:'application/pdf' })`.
3. `INSERT INTO archived_documents` بـ `storage_path` نفسه.
4. **إذا فشل (3):** `supabase.storage.remove([path])` لمنع ملفات يتيمة.
5. Toast نجاح/فشل بالعربية + `invalidate(archiveKeys.all)`.

#### B3 — تحكم الواجهة بالدور (مهم — لا اعتماد على RLS فقط)

```tsx
const { role } = useAuth();
const canWrite = role === 'admin';
// إخفاء "رفع جديد" + "تعديل" + "حذف" + "نشر/إخفاء" عن المحاسب
```

#### B4 — Zod schema

```ts
const ArchiveUploadSchema = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.enum(['meeting_minutes','annual_reports','certificates',
                    'official_contracts','correspondence','other']),
  description: z.string().trim().max(500).optional(),
  document_date: z.string().date().optional(),
  file: z.instanceof(File)
    .refine(f => f.type === 'application/pdf', 'PDF فقط')
    .refine(f => f.size <= 10*1024*1024, 'الحد الأقصى 10MB'),
});
```

---

### C) التكاملات الكاملة

| ملف | التعديل |
|------|---------|
| `src/routes/adminRoutes.tsx` | `<Route path="/dashboard/archive" element={pr(ADMIN_ROLES, <ArchivePage />)} />` |
| `src/routes/beneficiaryRoutes.tsx` | `<Route path="/beneficiary/archive" element={pr(ALL_NON_ACCOUNTANT, <ArchiveViewPage />)} />` |
| `src/constants/routeRegistry.ts` | إضافة الإدخالين لـ `ADMIN_ROUTES` و `BENEFICIARY_ROUTES` مع `title`, `labelKey:'archive'`, `permKey:'archive'`, `sectionKey:'archive'` |
| `src/constants/routeRoles.ts` | `'/dashboard/archive': ['admin','accountant']` + `'/beneficiary/archive': ['admin','beneficiary','waqif']` |
| `src/constants/navigation.ts` | تحديث `defaultAdminSections.archive = true` و `defaultBeneficiarySections.archive = true` + اشتقاق `ADMIN_ROUTE_TO_SECTION` تلقائي من `ADMIN_ROUTES.sectionKey` |
| `src/types/navigation.ts` (`MenuLabels`) | إضافة `archive: string;` + `defaultMenuLabels.archive = 'الأرشيف'` |
| `src/components/beneficiary/dashboard/BeneficiaryQuickLinks.tsx` | بطاقة جديدة «أرشيف الوثائق» (`FolderArchive` icon) |
| `src/components/waqif/WaqifQuickLinks.tsx` | نفس البطاقة |
| `src/lib/diagnostics/checks/backend.ts` (`required`) | `['waqf-assets', 'waqf-documents']` — لتمرير فحص التشخيص الجديد |
| **بدون تعديل** | `bottomNavLinks.ts` (الـ 4 الرئيسية ممتلئة) · `PROTECTED_ADMIN_SECTIONS` (نسمح بالإخفاء) · `access_log` · `audit_log` |

---

### D) ترتيب التنفيذ الفعلي

```text
1) supabase--storage_create_bucket(name='waqf-documents', public=false)
2) Migration A1: جدول + GRANT + RLS + index + trigger
3) Migration A2: سياسات storage.objects على waqf-documents
4) Types + utils + queryKeys (3 ملفات صغيرة)
5) hooks/data/archive/ (3 hooks)
6) hooks/page/ (admin + beneficiary)
7) 7 مكونات archive/
8) صفحتان: ArchivePage + ArchiveViewPage
9) التكامل (جدول C كاملاً — 9 ملفات)
10) Tests: useArchivedDocuments.test.ts + ArchiveUploadDialog.test.tsx
11) Playwright E2E يدوي:
    أ) ناظر يرفع PDF صحيح → يظهر فوراً
    ب) ناظر يرفع 11MB → رفض Zod
    ج) ناظر يخفي → مستفيد لا يرى عند refetch
    د) محاسب: لا يرى أزرار كتابة، يقرأ الكل
    هـ) فحص التشخيص: waqf-documents يمرّ + الصفحتان في ROUTE_ROLES
```

---

### E) معايير القبول

| # | المعيار | التحقق |
|---|---------|--------|
| 1 | ناظر يرفع PDF ≤10MB | يظهر فوراً + ملف في storage |
| 2 | محاسب يرى الكل، لا أزرار كتابة | عبر `useAuth().role` UI gate |
| 3 | مستفيد يرى المنشور فقط | RLS + UI |
| 4 | ملف >10MB أو غير PDF | يُرفض بـ Zod + CHECK |
| 5 | الحذف ذرّي: row + storage | بدون يتامى |
| 6 | Signed URL ينتهي بعد 60s | تأكد devtools |
| 7 | فحص التشخيص يكشف bucket والمسارات | `checkBackendStorageBuckets` + `appMap` |
| 8 | الناظر يخفي قسم «الأرشيف» من الإعدادات | يختفي من التنقّل (ليس في PROTECTED) |

---

### F) خارج النطاق (موجات لاحقة)

- استبدال ملف موجود (الآن: حذف ثم رفع).
- أنواع Word/Excel/صور.
- إشعار بريدي عند النشر.
- تصدير ZIP لفئة.
- ربط الوثيقة بعقد/مستفيد محدد.
- نسخ تاريخية (versioning).
- تسجيل المشاهدات (يحتاج جدول `document_views` مخصص).

هل أبدأ التنفيذ بالترتيب أعلاه؟