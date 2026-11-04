import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';

export interface OfficialLetterRow {
  id: string;
  letter_type: string;
  recipient: string;
  subject: string;
  body: string;
  doc_number: string | null;
  verification_code: string | null;
  status: string;
  created_at: string;
}

const KEY = ['official_letters'];

export const useOfficialLetters = () =>
  useQuery({
    queryKey: KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('official_letters').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as OfficialLetterRow[];
    },
  });

export const useSaveOfficialLetter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<OfficialLetterRow, 'id' | 'created_at' | 'status'>) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('official_letters').insert({ ...row, issued_by: auth.user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useVoidOfficialLetter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await rpc('void_official_letter', { p_letter_id: id }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
