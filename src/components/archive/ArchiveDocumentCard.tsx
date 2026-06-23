/**
 * بطاقة وثيقة واحدة في الأرشيف.
 * أزرار الكتابة (تعديل/حذف/تبديل النشر) تظهر فقط لمن لديه canWrite.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Download, Pencil, Trash2, EyeOff, FileText } from 'lucide-react';
import { ARCHIVE_CATEGORY_LABELS, type ArchivedDocument } from '@/types/archive';
import { formatBytes } from '@/utils/format/fileSize';

interface Props {
  doc: ArchivedDocument;
  canWrite: boolean;
  onPreview: (doc: ArchivedDocument) => void;
  onDownload: (doc: ArchivedDocument) => void;
  onEdit?: (doc: ArchivedDocument) => void;
  onDelete?: (doc: ArchivedDocument) => void;
  onTogglePublish?: (doc: ArchivedDocument) => void;
  togglePending?: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const ArchiveDocumentCard = ({
  doc, canWrite, onPreview, onDownload, onEdit, onDelete, onTogglePublish, togglePending,
}: Props) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-foreground line-clamp-2" title={doc.title}>
              {doc.title}
            </h3>
            {doc.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{ARCHIVE_CATEGORY_LABELS[doc.category]}</Badge>
          {!doc.is_published && canWrite && (
            <Badge variant="outline" className="border-warning text-warning">مسودة</Badge>
          )}
          <span className="text-muted-foreground">{formatBytes(doc.file_size_bytes)}</span>
          {doc.document_date && (
            <span className="text-muted-foreground">• {formatDate(doc.document_date)}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-auto pt-2 border-t">
          <Button size="sm" variant="outline" onClick={() => onPreview(doc)} className="gap-1.5">
            <Eye className="w-3.5 h-3.5" /> معاينة
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDownload(doc)} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> تنزيل
          </Button>

          {canWrite && (
            <div className="flex items-center gap-1 ms-auto">
              {onTogglePublish && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onTogglePublish(doc)}
                  disabled={togglePending}
                  aria-label={doc.is_published ? 'إخفاء' : 'نشر'}
                  title={doc.is_published ? 'إخفاء' : 'نشر'}
                >
                  {doc.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
              {onEdit && (
                <Button size="sm" variant="ghost" onClick={() => onEdit(doc)} aria-label="تعديل" title="تعديل">
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(doc)}
                  aria-label="حذف"
                  title="حذف"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ArchiveDocumentCard;
