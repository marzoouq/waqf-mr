---
name: lib-vs-utils-boundary
description: قاعدة فصل lib (stateful infrastructure) عن utils (pure functions) — قرار شجري مع أمثلة لمنع وضع toast/supabase في utils
type: preference
---

`lib/` = بنية تحتية ذات حالة وآثار جانبية مسموحة (Supabase, Storage, Auth, queryClient, logger, monitoring, notify).
`utils/` = دوال نقية بدون حالة وبدون آثار جانبية (format, calc, csv/xlsx builders, pdf generators).

**قرار سريع** (بالترتيب — أول إجابة بنعم تحدّد المكان):
- يستورد `supabase` / `Storage` / `Auth`؟ → `lib/`
- يستدعي `toast` من `sonner`؟ → `lib/` (أو يُرجع نتيجة من `utils/`)
- singleton / initialization (queryClient, logger)؟ → `lib/`
- يحتفظ بحالة عبر استدعاءات (cache, listener)؟ → `lib/`
- مدخل ثابت ينتج مخرج ثابت؟ → `utils/`

**ممنوعات `utils/`**:
- `import { toast } from 'sonner'`
- `import { supabase } from '@/integrations/supabase/client'`
- `import.meta` side effects أو module-level mutable state

**نمط بديل لاستبدال `toast` في `utils/`**: أرجع `Result` (`{ ok: true, data } | { ok: false, reason }`) واترك الطبقة المستدعية (`hooks/page/`) تُشعر عبر `lib/notify.ts`.

**نماذج معتمدة**:
- `utils/format`, `utils/distributionCalcPure`, `utils/dashboardComputations` — pure
- `lib/queryClient`, `lib/logger`, `lib/notify`, `lib/services/invoiceStorageService` — stateful

**كيف أطبّقها في code review؟** ابحث في الـ diff عن `from 'sonner'` أو `from '@/integrations/supabase/client'` داخل أي ملف تحت `src/utils/` — ارفض المراجعة.
