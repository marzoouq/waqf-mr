/**
 * Sub-hooks لحالة نماذج اللائحة التنظيمية.
 * مستخرجة من `useBylawsPage` لتقليل كثافة `useState`.
 */
import { useCallback, useState } from 'react';
import type { BylawEntry } from '@/hooks/data/content/useBylaws';

const DEFAULT_NEW_BYLAW = { part_title: '', chapter_title: '', content: '', part_number: 0 };

export function useBylawAddForm() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBylaw, setNewBylaw] = useState(DEFAULT_NEW_BYLAW);

  const resetAdd = useCallback(() => {
    setShowAddDialog(false);
    setNewBylaw(DEFAULT_NEW_BYLAW);
  }, []);

  return { showAddDialog, setShowAddDialog, newBylaw, setNewBylaw, resetAdd };
}

export function useBylawEditForm() {
  const [editItem, setEditItem] = useState<BylawEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPartNumber, setEditPartNumber] = useState(0);
  const [editPartTitle, setEditPartTitle] = useState('');
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [editChapterNumber, setEditChapterNumber] = useState<number | null>(null);

  const openEdit = useCallback((item: BylawEntry) => {
    setEditItem(item);
    setEditContent(item.content);
    setEditPartNumber(item.part_number);
    setEditPartTitle(item.part_title);
    setEditChapterTitle(item.chapter_title || '');
    setEditChapterNumber(item.chapter_number);
  }, []);

  return {
    editItem,
    setEditItem,
    editContent,
    setEditContent,
    editPartNumber,
    setEditPartNumber,
    editPartTitle,
    setEditPartTitle,
    editChapterTitle,
    setEditChapterTitle,
    editChapterNumber,
    setEditChapterNumber,
    openEdit,
  };
}
