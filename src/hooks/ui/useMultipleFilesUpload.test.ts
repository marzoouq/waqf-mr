import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultipleFilesUpload } from './useMultipleFilesUpload';

beforeEach(() => {
  // jsdom: توفير stubs
  if (!('createObjectURL' in URL)) {
    // @ts-expect-error test stub
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    // @ts-expect-error test stub
    URL.revokeObjectURL = vi.fn();
  }
  if (!('randomUUID' in crypto)) {
    // @ts-expect-error test stub
    crypto.randomUUID = () => Math.random().toString(36).slice(2);
  }
});

const makeFile = (name: string, type: string, size = 1024) => {
  const f = new File([new Uint8Array(size)], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('useMultipleFilesUpload', () => {
  it('يضيف ملفات صالحة', () => {
    const { result } = renderHook(() => useMultipleFilesUpload());
    act(() => result.current.addFiles([makeFile('a.pdf', 'application/pdf'), makeFile('b.png', 'image/png')]));
    expect(result.current.files).toHaveLength(2);
    expect(result.current.error).toBe('');
  });

  it('يرفض النوع غير المسموح ويسجّل الخطأ', () => {
    const { result } = renderHook(() => useMultipleFilesUpload());
    act(() => result.current.addFiles([makeFile('a.exe', 'application/x-msdownload')]));
    expect(result.current.files).toHaveLength(0);
    expect(result.current.error).toContain('نوع غير مسموح');
  });

  it('يرفض الملفات الأكبر من 10MB', () => {
    const { result } = renderHook(() => useMultipleFilesUpload());
    act(() => result.current.addFiles([makeFile('big.pdf', 'application/pdf', 11 * 1024 * 1024)]));
    expect(result.current.files).toHaveLength(0);
    expect(result.current.error).toContain('10 ميجابايت');
  });

  it('يفرض الحد الأقصى للعدد', () => {
    const { result } = renderHook(() => useMultipleFilesUpload(2));
    act(() => result.current.addFiles([
      makeFile('a.pdf', 'application/pdf'),
      makeFile('b.pdf', 'application/pdf'),
      makeFile('c.pdf', 'application/pdf'),
    ]));
    expect(result.current.files).toHaveLength(2);
    expect(result.current.error).toContain('الحد الأقصى');
  });

  it('يحذف ملف بواسطة id', () => {
    const { result } = renderHook(() => useMultipleFilesUpload());
    act(() => result.current.addFiles([makeFile('a.pdf', 'application/pdf')]));
    const id = result.current.files[0]!.id;
    act(() => result.current.removeFile(id));
    expect(result.current.files).toHaveLength(0);
  });

  it('يعيد التهيئة بـ reset', () => {
    const { result } = renderHook(() => useMultipleFilesUpload());
    act(() => result.current.addFiles([makeFile('a.pdf', 'application/pdf')]));
    act(() => result.current.reset());
    expect(result.current.files).toHaveLength(0);
    expect(result.current.error).toBe('');
  });
});
