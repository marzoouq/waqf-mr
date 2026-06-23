/**
 * أنواع مركز أرشفة الوثائق
 */

/** تصنيفات الوثائق الثابتة (6) */
export const ARCHIVE_CATEGORIES = [
  'meeting_minutes',
  'annual_reports',
  'certificates',
  'official_contracts',
  'correspondence',
  'other',
] as const;

export type ArchiveCategory = typeof ARCHIVE_CATEGORIES[number];

/** التسميات العربية لكل تصنيف */
export const ARCHIVE_CATEGORY_LABELS: Record<ArchiveCategory, string> = {
  meeting_minutes: 'محاضر الاجتماعات',
  annual_reports: 'التقارير السنوية',
  certificates: 'الشهادات والصكوك',
  official_contracts: 'العقود الرسمية',
  correspondence: 'المراسلات',
  other: 'أخرى',
};

/** سجل وثيقة في الأرشيف */
export interface ArchivedDocument {
  id: string;
  title: string;
  description: string | null;
  category: ArchiveCategory;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  document_date: string | null;
  is_published: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

/** حدود الملف */
export const ARCHIVE_FILE_LIMITS = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_MIME: 'application/pdf' as const,
  BUCKET: 'waqf-documents' as const,
  PATH_PREFIX: 'archive' as const,
};
