/**
 * استعلام قائمة الوثائق المؤرشفة — يحترم RLS تلقائياً حسب دور المستخدم.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import { archiveKeys, type ArchiveListFilters } from '@/lib/queryKeys/archiveKeys';
import type { ArchivedDocument } from '@/types/archive';

export function useArchivedDocuments(filters: ArchiveListFilters = {}) {
  return useQuery({
    queryKey: archiveKeys.list(filters),
    queryFn: async (): Promise<ArchivedDocument[]> => {
      let q = supabase
        .from('archived_documents')
        .select('*')
        .order('document_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.category && filters.category !== 'all') {
        q = q.eq('category', filters.category);
      }
      if (filters.publishedOnly) {
        q = q.eq('is_published', true);
      }
      if (filters.search?.trim()) {
        const term = filters.search.trim().replace(/[%,]/g, '');
        q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ArchivedDocument[];
    },
    staleTime: STALE_STATIC,
    placeholderData: (prev) => prev,
  });
}
