/**
 * اختبار وحدة لـ useAiChatState — يتحقق من القيم الابتدائية والتفاعلات الأساسية.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAiChatState } from './useAiChatState';

describe('useAiChatState', () => {
  it('يبدأ بقيم افتراضية صحيحة', () => {
    const { result } = renderHook(() => useAiChatState());
    expect(result.current.open).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe('');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.mode).toBe('chat');
    expect(result.current.error).toBeNull();
  });

  it('setOpen يبدّل اللوحة', () => {
    const { result } = renderHook(() => useAiChatState());
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });

  it('clearMessages يفرغ الرسائل ويصفّر الخطأ', () => {
    const { result } = renderHook(() => useAiChatState());
    act(() => {
      result.current.setMessages([{ role: 'user', content: 'مرحبا' }]);
      result.current.setError('خطأ سابق');
    });
    act(() => result.current.clearMessages());
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handleModeChange يبدّل الوضع ويصفّر الرسائل', () => {
    const { result } = renderHook(() => useAiChatState());
    act(() => result.current.setMessages([{ role: 'assistant', content: 'سابق' }]));
    act(() => result.current.handleModeChange('analysis'));
    expect(result.current.mode).toBe('analysis');
    expect(result.current.messages).toEqual([]);
  });

  it('closePanel يُغلق اللوحة', () => {
    const { result } = renderHook(() => useAiChatState());
    act(() => result.current.setOpen(true));
    act(() => result.current.closePanel());
    expect(result.current.open).toBe(false);
  });
});
