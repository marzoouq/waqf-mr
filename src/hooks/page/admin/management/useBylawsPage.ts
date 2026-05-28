/**
 * هوك منطق صفحة اللائحة التنظيمية.
 * حالة نماذج الإضافة/التعديل مستخرجة في `useBylawsForms`.
 */
import { useMemo, useState, useCallback } from 'react';
import { useBylawsList, useCreateBylaw, useUpdateBylaw, useDeleteBylaw, useReorderBylaws, type BylawEntry } from '@/hooks/data/content/useBylaws';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { uiNotify } from '@/lib/notify';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import {
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useBylawAddForm, useBylawEditForm } from './useBylawsForms';

export function useBylawsPage() {
  const { data: bylaws, isLoading } = useBylawsList();
  const updateBylaw = useUpdateBylaw();
  const createBylaw = useCreateBylaw();
  const deleteBylaw = useDeleteBylaw();
  const reorderBylaws = useReorderBylaws();
  const { data: settings, updateSetting } = useAppSettings();
  const pdfWaqfInfo = usePdfWaqfInfo();

  // sub-hooks لحالة النماذج
  const addForm = useBylawAddForm();
  const editForm = useBylawEditForm();

  // حالة مستقلة منفردة
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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = allBylaws.findIndex((b) => b.id === active.id);
      const newIndex = allBylaws.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(allBylaws, oldIndex, newIndex);
      const updates = reordered.map((item, idx) => ({ id: item.id, sort_order: idx }));
      reorderBylaws.mutate(updates);
    },
    [allBylaws, reorderBylaws],
  );

  const handleSave = () => {
    if (!editForm.editItem || !editForm.editPartTitle.trim()) return;
    updateBylaw.mutate(
      {
        id: editForm.editItem.id,
        content: editForm.editContent,
        part_number: editForm.editPartNumber,
        part_title: editForm.editPartTitle.trim(),
        chapter_title: editForm.editChapterTitle.trim() || null,
        chapter_number: editForm.editChapterNumber,
      },
      { onSuccess: () => editForm.setEditItem(null) },
    );
  };

  const toggleVisibility = (item: BylawEntry) => {
    updateBylaw.mutate({ id: item.id, is_visible: !item.is_visible });
  };

  const togglePublish = async () => {
    const newValue = isPublished ? 'false' : 'true';
    try {
      await updateSetting.mutateAsync({ key: 'bylaws_published', value: newValue });
      uiNotify.success(newValue === 'true' ? 'تم نشر اللائحة للمستفيدين' : 'تم حجب اللائحة عن المستفيدين');
    } catch {
      uiNotify.error('حدث خطأ أثناء تحديث حالة النشر');
    }
  };

  const handleAdd = () => {
    if (!addForm.newBylaw.part_title.trim()) return;
    createBylaw.mutate(
      {
        part_number: addForm.newBylaw.part_number,
        part_title: addForm.newBylaw.part_title.trim(),
        chapter_title: addForm.newBylaw.chapter_title.trim() || undefined,
        content: addForm.newBylaw.content.trim(),
        sort_order: allBylaws.length,
      },
      {
        onSuccess: () => addForm.resetAdd(),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteBylaw.mutate(deleteItem.id, { onSuccess: () => setDeleteItem(null) });
  };

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
