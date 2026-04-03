/**
 * مصنع قنوات Realtime — يلف supabase.channel لفصل الطبقات
 */
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const createRealtimeChannel = (name: string): RealtimeChannel => supabase.channel(name);

export const removeRealtimeChannel = (ch: RealtimeChannel): void => {
  supabase.removeChannel(ch);
};

export const getRealtimeChannels = (): RealtimeChannel[] | null => {
  const getChannels = (supabase as unknown as { getChannels?: () => RealtimeChannel[] }).getChannels;
  if (typeof getChannels !== 'function') return null;
  try {
    return getChannels();
  } catch {
    return null;
  }
};
