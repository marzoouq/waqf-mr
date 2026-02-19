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
  });

  const updateBylaw = useMutation({
    mutationFn: async ({ id, content, is_visible }: { id: string; content?: string; is_visible?: boolean }) => {
      const updates: Record<string, unknown> = {};
      if (content !== undefined) updates.content = content;
      if (is_visible !== undefined) updates.is_visible = is_visible;
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

  return { ...query, updateBylaw };
};
