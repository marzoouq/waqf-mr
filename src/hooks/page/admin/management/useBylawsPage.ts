/**
 * هوك منطق صفحة اللائحة التنظيمية — حالة UI + استعلامات.
 * Mutations مستخرجة في useBylawsMutations؛ نماذج الإضافة/التعديل في useBylawsForms.
 */
import { useMemo, useState } from 'react';
import { useBylawsList, useCreateBylaw, useUpdateBylaw, useDeleteBylaw, useReorderBylaws, type BylawEntry } from '@/hooks/data/content/useBylaws';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useBylawAddForm, useBylawEditForm } from './useBylawsForms';
import { useBylawsMutations } from './useBylawsMutations';

export function useBylawsPage() {
  const { data: bylaws, isLoading } = useBylawsList();
  const updateBylaw = useUpdateBylaw();
  const createBylaw = useCreateBylaw();
  const deleteBylaw = useDeleteBylaw();
  const reorderBylaws = useReorderBylaws();
  const { data: settings, updateSetting } = useAppSettings();
  const pdfWaqfInfo = usePdfWaqfInfo();

  const addForm = useBylawAddForm();
  const editForm = useBylawEditForm();

  const [search, setSearch] = useState('');
  const [deleteItem, setDeleteItem] = useState<BylawEntry | null>(null);

  const isPublished = settings?.bylaws_published === 'true';
  const allBylaws = useMemo(() => bylaws ?? [], [bylaws]);

  const visibleBylaws = useMemo(() => {
    if (!search.trim()) return allBylaws;
    const q = search.trim().toLowerCase();
    return allBylaws.filter(
      (b) =>
        b.part_title.toLowerCase().includes(q) ||
        (b.chapter_title && b.chapter_title.toLowerCase().includes(q)) ||
        b.content.toLowerCase().includes(q),
    );
  }, [allBylaws, search]);

  const isSearching = search.trim().length > 0;

  const stats = useMemo(() => {
    const total = allBylaws.length;
    const visible = allBylaws.filter((b) => b.is_visible).length;
    const hidden = total - visible;
    return { total, visible, hidden };
  }, [allBylaws]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { handleDragEnd, handleSave, toggleVisibility, togglePublish, handleAdd, handleDelete } =
    useBylawsMutations({
      allBylaws, addForm, editForm, deleteItem, setDeleteItem,
      isPublished, createBylaw, updateBylaw, deleteBylaw, reorderBylaws, updateSetting,
    });

  return {
    isLoading,
    allBylaws,
    visibleBylaws,
    isSearching,
    stats,
    isPublished,
    sensors,
    handleDragEnd,
    // بحث
    search, setSearch,
    // إضافة
    showAddDialog: addForm.showAddDialog,
    setShowAddDialog: addForm.setShowAddDialog,
    newBylaw: addForm.newBylaw,
    setNewBylaw: addForm.setNewBylaw,
    handleAdd,
    createBylawPending: createBylaw.isPending,
    // تعديل
    editItem: editForm.editItem,
    setEditItem: editForm.setEditItem,
    editContent: editForm.editContent,
    setEditContent: editForm.setEditContent,
    editPartNumber: editForm.editPartNumber,
    setEditPartNumber: editForm.setEditPartNumber,
    editPartTitle: editForm.editPartTitle,
    setEditPartTitle: editForm.setEditPartTitle,
    editChapterTitle: editForm.editChapterTitle,
    setEditChapterTitle: editForm.setEditChapterTitle,
    editChapterNumber: editForm.editChapterNumber,
    setEditChapterNumber: editForm.setEditChapterNumber,
    openEdit: editForm.openEdit,
    handleSave,
    updateBylawPending: updateBylaw.isPending,
    // حذف
    deleteItem, setDeleteItem,
    handleDelete,
    deleteBylawPending: deleteBylaw.isPending,
    // إظهار/إخفاء
    toggleVisibility,
    togglePublish,
    // ترتيب
    reorderPending: reorderBylaws.isPending,
    // PDF
    pdfWaqfInfo,
  };
}
