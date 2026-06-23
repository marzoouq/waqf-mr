/**
 * شبكة بطاقات الوثائق + skeleton + empty state.
 */
import { Card, CardContent } from '@/components/ui/card';
import { FolderArchive } from 'lucide-react';
import ArchiveDocumentCard from './ArchiveDocumentCard';
import type { ArchivedDocument } from '@/types/archive';

interface Props {
  documents: ArchivedDocument[];
  isLoading: boolean;
  canWrite: boolean;
  onPreview: (doc: ArchivedDocument) => void;
  onDownload: (doc: ArchivedDocument) => void;
  onEdit?: (doc: ArchivedDocument) => void;
  onDelete?: (doc: ArchivedDocument) => void;
  onTogglePublish?: (doc: ArchivedDocument) => void;
  togglePending?: boolean;
  emptyMessage?: string;
}

const Skeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-4 h-40 bg-muted/30 rounded-lg" />
      </Card>
    ))}
  </div>
);

const ArchiveDocumentList = ({ documents, isLoading, emptyMessage, ...rest }: Props) => {
  if (isLoading) return <Skeleton />;

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center gap-3 p-8">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <FolderArchive className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">لا توجد وثائق</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {emptyMessage ?? 'لم يتم العثور على وثائق تطابق معايير البحث.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <ArchiveDocumentCard key={doc.id} doc={doc} {...rest} />
      ))}
    </div>
  );
};

export default ArchiveDocumentList;
