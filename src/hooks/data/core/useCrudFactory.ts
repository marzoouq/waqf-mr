/**
 * createCrudFactory — Composer لمصنع CRUD الموحَّد
 *
 * يُنتج خمسة helpers جاهزة (useList / useCreate / useUpdate / useDelete / getQueryOptions)
 * لأي جدول Supabase. التفاصيل مُقسَّمة إلى وحدتين:
 *   - crud/useListQuery.ts        (useList + getQueryOptions)
 *   - crud/useCrudMutations.ts    (useCreate / useUpdate / useDelete)
 *
 * نفس الـ API الخارجي محفوظ بالكامل — لا تغيير في المستهلكين.
 */
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import type {
  TableName, Row, CrudFactoryConfig,
} from './crudFactory.types';
import { buildListHelpers } from './crud/useListQuery';
import { buildMutationHelpers } from './crud/useCrudMutations';

// إعادة تصدير الأنواع للتوافق
export type { CrudNotifications } from './crudFactory.types';

export function createCrudFactory<T extends TableName, TData = Row<T>>(
  config: CrudFactoryConfig<T, TData>,
) {
  const {
    table,
    queryKey,
    select = '*',
    orderBy = 'created_at',
    ascending = false,
    limit = 500,
    label,
    onCreateSuccess,
    onUpdateSuccess,
    staleTime = STALE_FINANCIAL,
    notifications,
  } = config;

  const { useList, getQueryOptions } = buildListHelpers<T, TData>({
    table, queryKey, select, orderBy, ascending, limit, label, staleTime, notifications,
  });

  const { useCreate, useUpdate, useDelete } = buildMutationHelpers<T, TData>({
    table, queryKey, label, notifications, onCreateSuccess, onUpdateSuccess,
  });

  return { useList, useCreate, useUpdate, useDelete, getQueryOptions };
}
