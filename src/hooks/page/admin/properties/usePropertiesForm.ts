/**
 * هوك حالة نموذج العقارات (إنشاء/تعديل/حذف)
 * مُستخرَج من usePropertiesPage.
 */
import { useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import type { Property } from '@/types';
import { useCreateProperty, useUpdateProperty, useDeleteProperty } from '@/hooks/data/properties/useProperties';
import { usePropertyVatSync } from '@/hooks/data/properties/usePropertyVatSync';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';

const EMPTY_FORM = { property_number: '', property_type: '', location: '', area: '', description: '', vat_exempt: false };

export function usePropertiesForm() {
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const vatSync = usePropertyVatSync();

  const [isOpen, setIsOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingProperty(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.property_number || !formData.property_type || !formData.location || !formData.area) {
      uiNotify.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const propertyData = {
      property_number: formData.property_number,
      property_type: formData.property_type,
      location: formData.location,
      area: parseFloat(formData.area),
      description: formData.description || undefined,
      vat_exempt: formData.vat_exempt,
    };
    try {
      if (editingProperty) {
        const vatExemptChanged = (editingProperty.vat_exempt ?? false) !== formData.vat_exempt;
        await updateProperty.mutateAsync({ id: editingProperty.id, ...propertyData });
        if (vatExemptChanged) {
          try {
            const { updated, skipped } = await vatSync.mutateAsync(editingProperty.id);
            if (updated > 0 || skipped > 0) {
              uiNotify.success(`تمت مزامنة الضريبة: تم تحديث ${updated} فاتورة${skipped > 0 ? ` وتخطّي ${skipped} فاتورة محمية (مدفوعة/مرسلة لـ ZATCA)` : ''}`);
            }
          } catch (err) {
            logger.warn('property vat sync failed', err);
            uiNotify.error('تم حفظ العقار لكن تعذّر مزامنة فواتير الضريبة تلقائياً');
          }
        }
      } else {
        await createProperty.mutateAsync(propertyData);
      }
      setIsOpen(false);
      resetForm();
    } catch {
      // onError in mutation already shows toast
    }
  };

  const handleEdit = (property: Property, e: MouseEvent) => {
    e.stopPropagation();
    setEditingProperty(property);
    setFormData({
      property_number: property.property_number,
      property_type: property.property_type,
      location: property.location,
      area: property.area.toString(),
      description: property.description || '',
      vat_exempt: property.vat_exempt ?? false,
    });
    setIsOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProperty.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // onError in mutation already shows toast
    }
  };

  return {
    isOpen, setIsOpen,
    editingProperty,
    formData, setFormData,
    deleteTarget, setDeleteTarget,
    resetForm, handleSubmit, handleEdit, handleConfirmDelete,
    createPending: createProperty.isPending,
    updatePending: updateProperty.isPending,
  };
}
