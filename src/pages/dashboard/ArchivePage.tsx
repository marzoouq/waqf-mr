/**
 * صفحة أرشيف الوثائق — لوحة الناظر والمحاسب.
 * - الناظر: رفع/تعديل/حذف/تبديل النشر.
 * - المحاسب: قراءة فقط (تخفى أزرار الكتابة عبر canWrite).
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FolderArchive, Plus, AlertCircle, FileText, EyeOff } from 'lucide-react';
import ArchiveFilters from '@/components/archive/ArchiveFilters';
import ArchiveDocumentList from '@/components/archive/ArchiveDocumentList';
import ArchiveUploadDialog from '@/components/archive/ArchiveUploadDialog';
import ArchiveEditDialog from '@/components/archive/ArchiveEditDialog';
import ArchiveDeleteDialog from '@/components/archive/ArchiveDeleteDialog';
import ArchivePdfPreviewDialog from '@/components/archive/ArchivePdfPreviewDialog';
import { useArchivePage } from '@/hooks/page/admin/management/useArchivePage';

const StatCard = ({
  label, value, icon: Icon, tone,
}: { label: string; value: number; icon: typeof FileText; tone: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

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
      <div className="p-4 md:p-6 space-y-6">
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

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard label="إجمالي الوثائق" value={a.stats.total} icon={FolderArchive} tone="bg-primary/10 text-primary" />
          <StatCard label="منشورة" value={a.stats.published} icon={FileText} tone="bg-success/10 text-success" />
          <StatCard label="مسودات" value={a.stats.drafts} icon={EyeOff} tone="bg-warning/10 text-warning" />
        </div>

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
