/**
 * نوع بند اللائحة (Waqf Bylaws)
 *
 * نُقل من `src/hooks/data/content/useBylaws.ts` ليكون الأنواع المشتركة في طبقة `types/`
 * بدلاً من تعريفها داخل ملفات الـhooks (تجنّب تسرّب أنواع النطاق إلى طبقة data).
 */
import type { Tables } from '@/integrations/supabase/types';

export type BylawEntry = Tables<'waqf_bylaws'>;
