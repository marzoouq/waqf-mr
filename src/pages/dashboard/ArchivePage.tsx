/**
 * صفحة أرشيف الوثائق — لوحة الناظر والمحاسب.
 * - الناظر: رفع/تعديل/حذف/تبديل النشر.
 * - المحاسب: قراءة فقط (تخفى أزرار الكتابة عبر canWrite).
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { FigureTile, FigureTileGrid } from '@/components/common';
import { FolderArchive, Plus, AlertCircle, FileText, EyeOff } from 'lucide-react';
import ArchiveFilters from '@/components/archive/ArchiveFilters';
import ArchiveDocumentList from '@/components/archive/ArchiveDocumentList';
import ArchiveUploadDialog from '@/components/archive/ArchiveUploadDialog';
import ArchiveEditDialog from '@/components/archive/ArchiveEditDialog';
import ArchiveDeleteDialog from '@/components/archive/ArchiveDeleteDialog';
import ArchivePdfPreviewDialog from '@/components/archive/ArchivePdfPreviewDialog';
import { YearScopeToggle } from '@/components/common';
import { useArchivePage } from '@/hooks/page/admin/management/useArchivePage';

const ArchivePage = () => {
  const a = useArchivePage();

  if (a.isError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-bold">تعذّر تحميل الأرشيف</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="أرشيف الوثائق"
          description="إدارة الوثائق الرسمية للوقف ونشرها للمستفيدين"
          icon={FolderArchive}
          actions={
            a.canWrite ? (
              <Button onClick={() => a.setUploadOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">رفع وثيقة</span>
              </Button>
            ) : null
          }
        />

        <FigureTileGrid isLoading={a.isLoading} cols="grid-cols-1 sm:grid-cols-3" skeletonCount={3}>
          <FigureTile label="إجمالي الوثائق" value={a.stats.total} icon={FolderArchive} unit="count" />
          <FigureTile label="منشورة" value={a.stats.published} icon={FileText} tone="success" unit="count" />
          <FigureTile label="مسودات" value={a.stats.drafts} icon={EyeOff} tone="warning" unit="count" />
        </FigureTileGrid>

        <YearScopeToggle allYears={a.allYears} onChange={a.setAllYears} yearLabel={a.yearLabel} />

        <ArchiveFilters
          category={a.category} onCategoryChange={a.setCategory}
          search={a.search} onSearchChange={a.setSearch}
        />

        <ArchiveDocumentList
          documents={a.documents}
          isLoading={a.isLoading}
          canWrite={a.canWrite}
          onPreview={a.handlePreview}
          onDownload={a.handleDownload}
          onEdit={a.canWrite ? a.setEditTarget : undefined}
          onDelete={a.canWrite ? a.setDeleteTarget : undefined}
          onTogglePublish={a.canWrite ? a.handleTogglePublish : undefined}
          togglePending={a.togglePending}
          emptyMessage={a.canWrite ? 'ابدأ برفع أول وثيقة في الأرشيف.' : undefined}
        />
      </div>

      {a.canWrite && (
        <>
          <ArchiveUploadDialog
            open={a.uploadOpen}
            onOpenChange={a.setUploadOpen}
            onSubmit={a.handleUpload}
            pending={a.uploadPending}
          />
          <ArchiveEditDialog
            target={a.editTarget}
            onClose={() => a.setEditTarget(null)}
            onSubmit={a.handleUpdate}
            pending={a.updatePending}
          />
          <ArchiveDeleteDialog
            target={a.deleteTarget}
            onClose={() => a.setDeleteTarget(null)}
            onConfirm={a.handleDelete}
            pending={a.deletePending}
          />
        </>
      )}

      <ArchivePdfPreviewDialog
        target={a.previewTarget}
        url={a.previewUrl}
        onClose={a.closePreview}
        onDownload={a.handleDownload}
      />
    </DashboardLayout>
  );
};

export default ArchivePage;
