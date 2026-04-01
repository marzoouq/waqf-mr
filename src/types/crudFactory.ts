/**
 * أنواع مصنع CRUD — مستخرجة لإعادة الاستخدام
 */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

// ---------------------------------------------------------------------------
// أنواع قاعدة البيانات
// ---------------------------------------------------------------------------

type Tables = Database['public']['Tables'];
export type CrudTableName = keyof Tables;
export type CrudRow<T extends CrudTableName> = Tables[T]['Row'];
export type CrudInsert<T extends CrudTableName> = Tables[T]['Insert'];
export type CrudUpdate<T extends CrudTableName> = Tables[T]['Update'];

// ---------------------------------------------------------------------------
// واجهة الإشعارات
// ---------------------------------------------------------------------------

/** واجهة إشعارات CRUD — يمكن تمريرها لتخصيص أو إلغاء الرسائل */
export interface CrudNotifications {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onInfo?: (message: string) => void;
}

// ---------------------------------------------------------------------------
// إعدادات المصنع
// ---------------------------------------------------------------------------

/** Configuration for the CRUD factory */
export interface CrudFactoryConfig<T extends CrudTableName, TData = CrudRow<T>> {
  /** Supabase table name */
  table: T;
  /** React-query cache key */
  queryKey: string;
  /** Custom select string (e.g. '*, property:properties(*)') – defaults to '*' */
  select?: string;
  /** Column to order by – defaults to 'created_at' */
  orderBy?: string;
  /** Order direction – defaults to descending */
  ascending?: boolean;
  /** Max rows per page – defaults to 500 */
  limit?: number;
  /** Arabic entity label for toast messages (e.g. 'العقار') */
  label: string;
  /** Callback after successful create – receives the created row */
  onCreateSuccess?: (data: TData) => void;
  /** Callback after successful update */
  onUpdateSuccess?: (data: TData) => void;
  /** ms before data is considered stale — defaults to 60 000 (1 min) */
  staleTime?: number;
  /** تخصيص إشعارات — إذا لم يُحدد يُستخدم toast الافتراضي */
  notifications?: CrudNotifications;
}

// ---------------------------------------------------------------------------
// نتيجة التصفح
// ---------------------------------------------------------------------------

/** نتيجة useList مع دعم التصفح */
export interface PaginatedQueryResult<TData> extends Omit<UseQueryResult<TData[]>, 'data'> {
  data: TData[] | undefined;
  /** رقم الصفحة الحالية (يبدأ من 0) */
  page: number;
  /** الانتقال إلى الصفحة التالية */
  nextPage: () => void;
  /** الانتقال إلى الصفحة السابقة */
  prevPage: () => void;
  /** الانتقال إلى صفحة محددة */
  goToPage: (p: number) => void;
  /** هل توجد صفحة تالية */
  hasNextPage: boolean;
  /** هل توجد صفحة سابقة */
  hasPrevPage: boolean;
  /** حجم الصفحة */
  pageSize: number;
}
