/**
 * هوك رفع ملفات متعددة — التحقق من النوع/الحجم + معاينة + إضافة/حذف/إعادة.
 * يعيد استخدام قواعد MIME/الحجم من useInvoiceFileUtils.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/hooks/data/invoices/useInvoiceFileUtils';

export const DEFAULT_MAX_FILES = 10;

export interface StagedFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

export interface UseMultipleFilesUploadReturn {
  files: StagedFile[];
  error: string;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  addFiles: (list: FileList | File[] | null) => void;
  removeFile: (id: string) => void;
  reset: () => void;
}

export function useMultipleFilesUpload(maxFiles: number = DEFAULT_MAX_FILES): UseMultipleFilesUploadReturn {
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // تنظيف روابط المعاينة عند إلغاء التركيب
  useEffect(() => {
    return () => {
      files.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((list: FileList | File[] | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    if (incoming.length === 0) return;

    setError('');
    setFiles((prev) => {
      const next: StagedFile[] = [...prev];
      const errs: string[] = [];

      for (const file of incoming) {
        if (next.length >= maxFiles) {
          errs.push(`الحد الأقصى ${maxFiles} ملفات`);
          break;
        }
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          errs.push(`${file.name}: نوع غير مسموح`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errs.push(`${file.name}: الحجم يتجاوز 10 ميجابايت`);
          continue;
        }
        next.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        });
      }

      if (errs.length > 0) setError(errs.join(' — '));
      return next;
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [maxFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const reset = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
      return [];
    });
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return { files, error, isDragging, setIsDragging, fileInputRef, addFiles, removeFile, reset };
}
