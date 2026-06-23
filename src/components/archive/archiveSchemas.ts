/**
 * نموذج Zod للتحقق من رفع وثيقة جديدة.
 */
import { z } from 'zod';
import { ARCHIVE_CATEGORIES, ARCHIVE_FILE_LIMITS } from '@/types/archive';

export const archiveUploadSchema = z.object({
  title: z.string().trim().min(3, 'العنوان قصير جداً').max(200, 'العنوان طويل جداً'),
  category: z.enum(ARCHIVE_CATEGORIES),
  description: z.string().trim().max(500, 'الوصف طويل جداً').optional().or(z.literal('')),
  document_date: z.string().optional().or(z.literal('')),
  file: z
    .instanceof(File, { message: 'يرجى اختيار ملف' })
    .refine((f) => f.type === ARCHIVE_FILE_LIMITS.ALLOWED_MIME, 'يُقبل PDF فقط')
    .refine((f) => f.size > 0 && f.size <= ARCHIVE_FILE_LIMITS.MAX_SIZE_BYTES, 'الحد الأقصى 10 ميجابايت'),
});

export type ArchiveUploadFormValues = z.infer<typeof archiveUploadSchema>;

export const archiveEditSchema = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.enum(ARCHIVE_CATEGORIES),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  document_date: z.string().optional().or(z.literal('')),
});

export type ArchiveEditFormValues = z.infer<typeof archiveEditSchema>;
