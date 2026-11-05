import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppSettingsWrite } from '@/hooks/data/settings/app/useAppSettingsWrite';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe('useAppSettingsWrite.getJsonSetting stability', () => {
  it('keeps the same reference across renders when data is unchanged (prevents permissions tab loop)', () => {
    const data = { a: '{"x":1}' };
    const { result, rerender } = renderHook(({ d }) => useAppSettingsWrite(d), { wrapper, initialProps: { d: data } });
    const first = result.current.getJsonSetting;
    rerender({ d: data });
    expect(result.current.getJsonSetting).toBe(first);
  });

  it('changes reference when data changes', () => {
    const { result, rerender } = renderHook(({ d }) => useAppSettingsWrite(d), { wrapper, initialProps: { d: { a: '1' } } });
    const first = result.current.getJsonSetting;
    rerender({ d: { a: '2' } });
    expect(result.current.getJsonSetting).not.toBe(first);
  });
});
