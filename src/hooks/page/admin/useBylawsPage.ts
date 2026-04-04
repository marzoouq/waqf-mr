/**
 * هوك منطق صفحة اللائحة التنظيمية
 */
import { useMemo, useState, useCallback } from 'react';
import { useBylawsList, useCreateBylaw, useUpdateBylaw, useDeleteBylaw, useReorderBylaws, type BylawEntry } from '@/hooks/data/content/useBylaws';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { toast } from 'sonner';
import {
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

export function useBylawsPage() {
  const { data: bylaws, isLoading } = useBylawsList();
  const updateBylaw = useUpdateBylaw();
  const createBylaw = useCreateBylaw();
  const deleteBylaw = useDeleteBylaw();
  const reorderBylaws = useReorderBylaws();
  const { data: settings, updateSetting } = useAppSettings();

  const [editItem, setEditItem] = useState<BylawEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState<BylawEntry | null>(null);
  const [newBylaw, setNewBylaw] = useState({ part_title: '', chapter_title: '', content: '', part_number: 0 });
  const [editPartNumber, setEditPartNumber] = useState(0);
  const [editPartTitle, setEditPartTitle] = useState('');
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [editChapterNumber, setEditChapterNumber] = useState<number | null>(null);

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

  const openEdit = (item: BylawEntry) => {
    setEditItem(item);
    setEditContent(item.content);
    setEditPartNumber(item.part_number);
    setEditPartTitle(item.part_title);
    setEditChapterTitle(item.chapter_title || '');
    setEditChapterNumber(item.chapter_number);
  };

  const handleSave = () => {
    if (!editItem || !editPartTitle.trim()) return;
    updateBylaw.mutate(
      {
        id: editItem.id,
        content: editContent,
        part_number: editPartNumber,
        part_title: editPartTitle.trim(),
        chapter_title: editChapterTitle.trim() || null,
        chapter_number: editChapterNumber,
      },
      { onSuccess: () => setEditItem(null) },
    );
  };

  const toggleVisibility = (item: BylawEntry) => {
    updateBylaw.mutate({ id: item.id, is_visible: !item.is_visible });
  };

  const togglePublish = async () => {
    const newValue = isPublished ? 'false' : 'true';
    try {
      await updateSetting.mutateAsync({ key: 'bylaws_published', value: newValue });
      toast.success(newValue === 'true' ? 'تم نشر اللائحة للمستفيدين' : 'تم حجب اللائحة عن المستفيدين');
    } catch {
      toast.error('حدث خطأ أثناء تحديث حالة النشر');
    }
  };

  const handleAdd = () => {
    if (!newBylaw.part_title.trim()) return;
    createBylaw.mutate(
      {
        part_number: newBylaw.part_number,
        part_title: newBylaw.part_title.trim(),
        chapter_title: newBylaw.chapter_title.trim() || undefined,
        content: newBylaw.content.trim(),
        sort_order: allBylaws.length,
      },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setNewBylaw({ part_title: '', chapter_title: '', content: '', part_number: 0 });
        },
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
    showAddDialog, setShowAddDialog,
    newBylaw, setNewBylaw,
    handleAdd,
    createBylawPending: createBylaw.isPending,
    // تعديل
    editItem, setEditItem,
    editContent, setEditContent,
    editPartNumber, setEditPartNumber,
    editPartTitle, setEditPartTitle,
    editChapterTitle, setEditChapterTitle,
    editChapterNumber, setEditChapterNumber,
    openEdit,
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
  };
}
