/**
 * اختبارات useBylawsMutations — تغطّي إنشاء/تحديث/حذف اللوائح
 * مع التحقق من التعامل الصحيح مع null لقيمة part_number.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBylawsMutations } from './useBylawsMutations';
import type { BylawEntry } from '@/hooks/data/content/useBylaws';

vi.mock('@/lib/notify', () => ({
  uiNotify: { success: vi.fn(), error: vi.fn() },
}));

const makeBylaw = (id: string, overrides: Partial<BylawEntry> = {}): BylawEntry => ({
  id,
  part_number: 1,
  part_title: 'الباب الأول',
  chapter_number: null,
  chapter_title: null,
  content: '',
  sort_order: 0,
  is_visible: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
} as BylawEntry);

function makeMutation<TVars>() {
  return {
    mutate: vi.fn<(vars: TVars, opts?: { onSuccess?: () => void; onError?: () => void }) => void>(),
    isPending: false,
  };
}

function setup(overrides: Partial<Parameters<typeof useBylawsMutations>[0]> = {}) {
  const createBylaw = makeMutation();
  const updateBylaw = makeMutation();
  const deleteBylaw = makeMutation<string>();
  const reorderBylaws = makeMutation();
  const updateSetting = { mutateAsync: vi.fn().mockResolvedValue(undefined) };

  const params = {
    allBylaws: [],
    addForm: {
      newBylaw: { part_number: null, part_title: '', chapter_title: '', content: '' },
      resetAdd: vi.fn(),
    },
    editForm: {
      editItem: null,
      editContent: '',
      editPartNumber: null,
      editPartTitle: '',
      editChapterTitle: '',
      editChapterNumber: null,
      setEditItem: vi.fn(),
    },
    deleteItem: null,
    setDeleteItem: vi.fn(),
    isPublished: false,
    createBylaw,
    updateBylaw,
    deleteBylaw,
    reorderBylaws,
    updateSetting,
    ...overrides,
  } as Parameters<typeof useBylawsMutations>[0];

  const hook = renderHook(() => useBylawsMutations(params));
  return { hook, params, createBylaw, updateBylaw, deleteBylaw, updateSetting };
}

describe('useBylawsMutations', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('handleAdd', () => {
    it('يحوّل part_number=null إلى 0 عند الإنشاء', () => {
      const { hook, params, createBylaw } = setup();
      params.addForm.newBylaw = { part_number: null, part_title: 'باب جديد', chapter_title: '', content: 'محتوى' };
      hook.rerender();
      act(() => hook.result.current.handleAdd());
      expect(createBylaw.mutate).toHaveBeenCalledTimes(1);
      const vars = createBylaw.mutate.mock.calls[0]![0] as { part_number: number };
      expect(vars.part_number).toBe(0);
    });

    it('يمرر part_number رقمياً كما هو', () => {
      const { hook, params, createBylaw } = setup();
      params.addForm.newBylaw = { part_number: 5, part_title: 'باب', chapter_title: 'فصل', content: 'x' };
      hook.rerender();
      act(() => hook.result.current.handleAdd());
      const vars = createBylaw.mutate.mock.calls[0]![0] as { part_number: number; chapter_title: string };
      expect(vars.part_number).toBe(5);
      expect(vars.chapter_title).toBe('فصل');
    });

    it('يتجاهل العملية عند فراغ part_title', () => {
      const { hook, createBylaw } = setup();
      act(() => hook.result.current.handleAdd());
      expect(createBylaw.mutate).not.toHaveBeenCalled();
    });
  });

  describe('handleSave', () => {
    it('يحوّل part_number=null إلى undefined عند التحديث', () => {
      const item = makeBylaw('b1');
      const { hook, params, updateBylaw } = setup();
      Object.assign(params.editForm, {
        editItem: item,
        editPartTitle: 'محدّث',
        editPartNumber: null,
        editChapterTitle: '',
        editChapterNumber: null,
        editContent: 'نص',
      });
      hook.rerender();
      act(() => hook.result.current.handleSave());
      const vars = updateBylaw.mutate.mock.calls[0]![0] as { part_number: number | undefined; id: string };
      expect(vars.id).toBe('b1');
      expect(vars.part_number).toBeUndefined();
    });

    it('لا ينفّذ التحديث بدون editItem', () => {
      const { hook, updateBylaw } = setup();
      act(() => hook.result.current.handleSave());
      expect(updateBylaw.mutate).not.toHaveBeenCalled();
    });
  });

  describe('handleDelete', () => {
    it('يستدعي deleteBylaw بـ id العنصر', () => {
      const item = makeBylaw('del-1');
      const { hook, deleteBylaw } = setup({ deleteItem: item });
      act(() => hook.result.current.handleDelete());
      expect(deleteBylaw.mutate).toHaveBeenCalledWith('del-1', expect.any(Object));
    });

    it('يتجاهل الحذف بدون عنصر محدد', () => {
      const { hook, deleteBylaw } = setup();
      act(() => hook.result.current.handleDelete());
      expect(deleteBylaw.mutate).not.toHaveBeenCalled();
    });
  });

  describe('toggleVisibility', () => {
    it('يعكس قيمة is_visible', () => {
      const item = makeBylaw('v1', { is_visible: true });
      const { hook, updateBylaw } = setup();
      act(() => hook.result.current.toggleVisibility(item));
      expect(updateBylaw.mutate).toHaveBeenCalledWith({ id: 'v1', is_visible: false });
    });
  });
});
