/**
 * هوك حالة نموذج العقارات (إنشاء/تعديل/حذف)
 * مُستخرَج من usePropertiesPage.
 */
import { useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import type { Property } from '@/types';
import { useCreateProperty, useUpdateProperty, useDeleteProperty } from '@/hooks/data/properties/useProperties';
import { defaultNotify } from '@/lib/notify';

const EMPTY_FORM = { property_number: '', property_type: '', location: '', area: '', description: '', vat_exempt: false };

export function usePropertiesForm() {
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

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
      defaultNotify.error('يرجى ملء جميع الحقول المطلوبة');
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
        await updateProperty.mutateAsync({ id: editingProperty.id, ...propertyData });
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
