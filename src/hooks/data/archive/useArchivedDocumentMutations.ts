/**
 * طفرات الأرشيف: رفع جديد، تعديل ميتاداتا، تبديل النشر، حذف ذرّي (row + storage).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { archiveKeys } from '@/lib/queryKeys/archiveKeys';
import { ARCHIVE_FILE_LIMITS, type ArchiveCategory, type ArchivedDocument } from '@/types/archive';

export interface ArchiveUploadInput {
  title: string;
  description?: string;
  category: ArchiveCategory;
  document_date?: string;
  file: File;
  uploadedBy: string;
}

function newStoragePath(): string {
  const uuid = crypto.randomUUID();
  return `${ARCHIVE_FILE_LIMITS.PATH_PREFIX}/${uuid}.pdf`;
}

export function useUploadArchivedDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ArchiveUploadInput): Promise<ArchivedDocument> => {
      const path = newStoragePath();

      // 1) رفع الملف
      const { error: upErr } = await supabase.storage
        .from(ARCHIVE_FILE_LIMITS.BUCKET)
        .upload(path, input.file, {
          contentType: ARCHIVE_FILE_LIMITS.ALLOWED_MIME,
          upsert: false,
        });
      if (upErr) {
        logger.error('archive: upload to storage failed', upErr);
        throw upErr;
      }

      // 2) إدراج السجل
      const { data, error: insErr } = await supabase
        .from('archived_documents')
        .insert({
          title: input.title.trim(),
          description: input.description?.trim() || null,
          category: input.category,
          storage_path: path,
          file_size_bytes: input.file.size,
          mime_type: ARCHIVE_FILE_LIMITS.ALLOWED_MIME,
          document_date: input.document_date || null,
          is_published: true,
          uploaded_by: input.uploadedBy,
        })
        .select('*')
        .single();

      if (insErr || !data) {
        // 3) Rollback — حذف الملف لمنع اليتامى
        await supabase.storage.from(ARCHIVE_FILE_LIMITS.BUCKET).remove([path]).catch(() => {});
        logger.error('archive: insert row failed, rolled back storage', insErr);
        throw insErr ?? new Error('فشل حفظ الوثيقة');
      }

      return data as ArchivedDocument;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: archiveKeys.all }),
  });
}

export interface ArchiveUpdateInput {
  id: string;
  title?: string;
  description?: string | null;
  category?: ArchiveCategory;
  document_date?: string | null;
}

export function useUpdateArchivedDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ArchiveUpdateInput): Promise<ArchivedDocument> => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('archived_documents')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error || !data) throw error ?? new Error('فشل التعديل');
      return data as ArchivedDocument;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: archiveKeys.all }),
  });
}

export function useToggleArchivedDocumentPublish() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from('archived_documents')
        .update({ is_published: isPublished })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: archiveKeys.all }),
  });
}

export function useDeleteArchivedDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (doc: Pick<ArchivedDocument, 'id' | 'storage_path'>) => {
      // 1) حذف الـ row أولاً
      const { error } = await supabase
        .from('archived_documents')
        .delete()
        .eq('id', doc.id);
      if (error) throw error;

      // 2) حذف الملف (لو فشل نُسجّل فقط — السجل المرجعي ذهب)
      const { error: rmErr } = await supabase.storage
        .from(ARCHIVE_FILE_LIMITS.BUCKET)
        .remove([doc.storage_path]);
      if (rmErr) logger.warn('archive: row deleted but storage remove failed', rmErr);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: archiveKeys.all }),
  });
}
