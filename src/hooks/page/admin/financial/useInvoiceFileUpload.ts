/**
 * هوك إدارة حالة ملف الفاتورة (اختيار، معاينة، تحقق MIME/حجم)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/hooks/data/invoices/useInvoices';

export function useInvoiceFileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تنظيف Object URL عند إلغاء الترتيب
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const validateAndSetFile = useCallback((file: File) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError('نوع الملف غير مسموح. الأنواع المسموحة: PDF, JPG, PNG, WEBP');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('حجم الملف يتجاوز الحد الأقصى (10 ميجابايت)');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFileError('');
    setSelectedFile(file);
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    });
  }, []);

  const resetFile = useCallback(() => {
    setSelectedFile(null);
    setFileError('');
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return {
    selectedFile,
    fileError,
    isDragging, setIsDragging,
    previewUrl,
    fileInputRef,
    validateAndSetFile,
    resetFile,
  };
}
