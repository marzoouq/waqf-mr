/**
 * معالجات mutations لصفحة اللائحة التنظيمية — مستخرجة من useBylawsPage.
 */
import { useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { UseMutationResult } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import type { BylawEntry } from '@/hooks/data/content/useBylaws';
import type { Insert, Update } from '@/types/data/crudFactory';

type AddForm = {
  newBylaw: { part_number: number | null; part_title: string; chapter_title: string; content: string };
  resetAdd: () => void;
};

type EditForm = {
  editItem: BylawEntry | null;
  editContent: string;
  editPartNumber: number | null;
  editPartTitle: string;
  editChapterTitle: string;
  editChapterNumber: number | null;
  setEditItem: (v: BylawEntry | null) => void;
};

// نوع mutation عام مع متغيرات مكتوبة بدقة — يطابق UseMutationResult بدون unknown
type MutationApi<TVariables> = Pick<
  UseMutationResult<unknown, Error, TVariables>,
  'mutate' | 'isPending'
>;

type CreateBylawVars = Insert<'waqf_bylaws'>;
type UpdateBylawVars = Update<'waqf_bylaws'> & { id: string };
type ReorderBylawVars = { id: string; sort_order: number }[];

interface Params {
  allBylaws: readonly BylawEntry[];
  addForm: AddForm;
  editForm: EditForm;
  deleteItem: BylawEntry | null;
  setDeleteItem: (v: BylawEntry | null) => void;
  isPublished: boolean;
  createBylaw: MutationApi<CreateBylawVars>;
  updateBylaw: MutationApi<UpdateBylawVars>;
  deleteBylaw: MutationApi<string>;
  reorderBylaws: MutationApi<ReorderBylawVars>;
  updateSetting: { mutateAsync: (v: { key: string; value: string }) => Promise<unknown> };
}

export function useBylawsMutations(params: Params) {
  const {
    allBylaws, addForm, editForm, deleteItem, setDeleteItem,
    isPublished, createBylaw, updateBylaw, deleteBylaw, reorderBylaws, updateSetting,
  } = params;

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = allBylaws.findIndex((b) => b.id === active.id);
    const newIndex = allBylaws.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove([...allBylaws], oldIndex, newIndex);
    const updates = reordered.map((item, idx) => ({ id: item.id, sort_order: idx }));
    reorderBylaws.mutate(updates, {
      onSuccess: () => uiNotify.success('تم حفظ الترتيب الجديد'),
      onError: () => uiNotify.error('حدث خطأ أثناء حفظ الترتيب'),
    });
  }, [allBylaws, reorderBylaws]);

  const handleSave = useCallback(() => {
    if (!editForm.editItem || !editForm.editPartTitle.trim()) return;
    updateBylaw.mutate(
      {
        id: editForm.editItem.id,
        content: editForm.editContent,
        part_number: editForm.editPartNumber ?? undefined,
        part_title: editForm.editPartTitle.trim(),
        chapter_title: editForm.editChapterTitle.trim() || null,
        chapter_number: editForm.editChapterNumber,
      },
      { onSuccess: () => editForm.setEditItem(null) },
    );
  }, [editForm, updateBylaw]);

  const toggleVisibility = useCallback((item: BylawEntry) => {
    updateBylaw.mutate({ id: item.id, is_visible: !item.is_visible });
  }, [updateBylaw]);

  const togglePublish = useCallback(async () => {
    const newValue = isPublished ? 'false' : 'true';
    try {
      await updateSetting.mutateAsync({ key: 'bylaws_published', value: newValue });
      uiNotify.success(newValue === 'true' ? 'تم نشر اللائحة للمستفيدين' : 'تم حجب اللائحة عن المستفيدين');
    } catch {
      uiNotify.error('حدث خطأ أثناء تحديث حالة النشر');
    }
  }, [isPublished, updateSetting]);

  const handleAdd = useCallback(() => {
    if (!addForm.newBylaw.part_title.trim()) return;
    createBylaw.mutate(
      {
        part_number: addForm.newBylaw.part_number,
        part_title: addForm.newBylaw.part_title.trim(),
        chapter_title: addForm.newBylaw.chapter_title.trim() || undefined,
        content: addForm.newBylaw.content.trim(),
        sort_order: allBylaws.length,
      },
      { onSuccess: () => addForm.resetAdd() },
    );
  }, [addForm, allBylaws.length, createBylaw]);

  const handleDelete = useCallback(() => {
    if (!deleteItem) return;
    deleteBylaw.mutate(deleteItem.id, { onSuccess: () => setDeleteItem(null) });
  }, [deleteItem, deleteBylaw, setDeleteItem]);

  return { handleDragEnd, handleSave, toggleVisibility, togglePublish, handleAdd, handleDelete };
}
