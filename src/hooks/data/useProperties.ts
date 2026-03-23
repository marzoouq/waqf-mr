/**
 * هوكات إدارة العقارات (CRUD)
 * يوفر: useProperties (جلب), useCreateProperty, useUpdateProperty, useDeleteProperty
 * الجدول: properties | الترتيب: حسب تاريخ الإنشاء (تنازلي)
 */
import { createCrudFactory } from './useCrudFactory';
import { Property } from '@/types/database';

const propertiesCrud = createCrudFactory<'properties', Property>({
  table: 'properties',
  queryKey: 'properties',
  label: 'العقار',
});

export const useProperties = propertiesCrud.useList;
export const useCreateProperty = propertiesCrud.useCreate;
export const useUpdateProperty = propertiesCrud.useUpdate;
export const useDeleteProperty = propertiesCrud.useDelete;
