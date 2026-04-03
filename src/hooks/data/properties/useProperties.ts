/**
 * هوكات إدارة العقارات (CRUD)
 * يوفر: useProperties (جلب), useCreateProperty, useUpdateProperty, useDeleteProperty
 * الجدول: properties | الترتيب: حسب تاريخ الإنشاء (تنازلي)
 */
import { createCrudFactory } from '../core/useCrudFactory';
import { Property } from '@/types/database';
import { STALE_STATIC } from '@/lib/queryStaleTime';

const propertiesCrud = createCrudFactory<'properties', Property>({
  table: 'properties',
  queryKey: 'properties',
  select: 'id, property_number, property_type, location, area, vat_exempt, description, created_at, updated_at',
  label: 'العقار',
  staleTime: STALE_STATIC,
});

export const useProperties = propertiesCrud.useList;
export const useCreateProperty = propertiesCrud.useCreate;
export const useUpdateProperty = propertiesCrud.useUpdate;
export const useDeleteProperty = propertiesCrud.useDelete;
