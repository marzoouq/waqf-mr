import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BylawEntry {
  id: string;
  part_number: number;
  chapter_number: number | null;
  part_title: string;
  chapter_title: string | null;
  content: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export const useBylaws = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['waqf_bylaws'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waqf_bylaws')
        .select('*')
        .order('sort_order', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as BylawEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateBylaw = useMutation({
    mutationFn: async ({ id, content, is_visible, part_number, part_title, chapter_title, chapter_number }: { id: string; content?: string; is_visible?: boolean; part_number?: number; part_title?: string; chapter_title?: string | null; chapter_number?: number | null }) => {
      const updates: Record<string, unknown> = {};
      if (content !== undefined) updates.content = content;
      if (is_visible !== undefined) updates.is_visible = is_visible;
      if (part_number !== undefined) updates.part_number = part_number;
      if (part_title !== undefined) updates.part_title = part_title;
      if (chapter_title !== undefined) updates.chapter_title = chapter_title;
      if (chapter_number !== undefined) updates.chapter_number = chapter_number;
      const { error } = await supabase.from('waqf_bylaws').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waqf_bylaws'] });
      toast.success('تم تحديث اللائحة بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث اللائحة');
    },
  });

  const reorderBylaws = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      const { error } = await supabase.rpc('reorder_bylaws', {
        items: JSON.stringify(items),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waqf_bylaws'] });
      toast.success('تم حفظ الترتيب الجديد');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حفظ الترتيب');
    },
  });

  const createBylaw = useMutation({
    mutationFn: async (entry: { part_number: number; part_title: string; chapter_title?: string; content: string; sort_order: number }) => {
      const { error } = await supabase.from('waqf_bylaws').insert(entry);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waqf_bylaws'] });
      toast.success('تم إضافة البند بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة البند');
    },
  });

  const deleteBylaw = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('waqf_bylaws').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waqf_bylaws'] });
      toast.success('تم حذف البند بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف البند');
    },
  });

  return { ...query, updateBylaw, reorderBylaws, createBylaw, deleteBylaw };
};
