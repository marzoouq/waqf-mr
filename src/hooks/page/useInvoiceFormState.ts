/**
 * حالة نموذج الفاتورة — state + file handling
 */
import { useState, useRef, useEffect } from 'react';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, type Invoice } from '@/hooks/data/useInvoices';
import type { InvoicePreviewData } from '@/components/invoices/InvoicePreviewDialog';

export const emptyFormData = {
  invoice_number: '', invoice_type: '', amount: '', date: '',
  property_id: '', contract_id: '', description: '', status: 'pending',
};

export type InvoiceFormData = typeof emptyFormData;

export const useInvoiceFormState = () => {
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; file_path?: string | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [_fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerFile, setViewerFile] = useState<{ path: string; name: string | null } | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreviewData | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [formData, setFormData] = useState<InvoiceFormData>(emptyFormData);

  // تنظيف رابط المعاينة عند التغيير
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const validateAndSetFile = (file: File) => {
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
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setSelectedFile(null);
    setFileError('');
    setEditingInvoice(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    // state
    editingInvoice, setEditingInvoice,
    isOpen, setIsOpen,
    searchQuery, setSearchQuery,
    filterType, setFilterType,
    filterStatus, setFilterStatus,
    deleteTarget, setDeleteTarget,
    currentPage, setCurrentPage,
    uploading, setUploading,
    selectedFile, isDragging, setIsDragging,
    previewUrl, fileInputRef,
    viewerFile, setViewerFile,
    previewInvoice, setPreviewInvoice,
    templateOpen, setTemplateOpen,
    viewMode, setViewMode,
    formData, setFormData,
    // handlers
    validateAndSetFile, resetForm,
  };
};
