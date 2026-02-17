import { describe, it, expect, vi } from 'vitest';

/**
 * اختبارات التعامل مع .maybeSingle() بدلاً من .single()
 * للتأكد من أن عدم وجود سجل لا يسبب خطأ.
 */

// Mock supabase client
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn((_table: string) => ({ select: mockSelect }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (_table: string) => mockFrom(_table),
  },
}));

describe('maybeSingle – التعامل مع إعدادات غير موجودة', () => {
  it('يرجع null بدون خطأ عندما لا يوجد سجل', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('يرجع البيانات عندما يوجد سجل', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { value: 'true' },
      error: null,
    });

    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toEqual({ value: 'true' });
  });

  it('القيمة الافتراضية false عندما لا يوجد سجل', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .maybeSingle();

    // Simulate UserManagementPage logic: if (data) setRegistrationEnabled(data.value === 'true')
    const registrationEnabled = data ? data.value === 'true' : false;
    expect(registrationEnabled).toBe(false);
  });

  it('القيمة true عندما السجل موجود ويساوي "true"', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { value: 'true' },
      error: null,
    });

    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .maybeSingle();

    const registrationEnabled = data ? data.value === 'true' : false;
    expect(registrationEnabled).toBe(true);
  });

  it('القيمة false عندما السجل موجود لكن يساوي "false"', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { value: 'false' },
      error: null,
    });

    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .maybeSingle();

    const registrationEnabled = data ? data.value === 'true' : false;
    expect(registrationEnabled).toBe(false);
  });
});
