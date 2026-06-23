/**
 * مفاتيح TanStack Query لأرشيف الوثائق
 */
import type { ArchiveCategory } from '@/types/archive';

export interface ArchiveListFilters {
  category?: ArchiveCategory | 'all';
  search?: string;
  publishedOnly?: boolean;
}

export const archiveKeys = {
  all: ['archived_documents'] as const,
  list: (filters?: ArchiveListFilters) =>
    ['archived_documents', 'list', filters ?? {}] as const,
  byId: (id: string) => ['archived_documents', 'by-id', id] as const,
  signedUrl: (path: string) => ['archived_documents', 'signed-url', path] as const,
} as const;
