/**
 * صفحة عرض الأرشيف — للمستفيد والواقف. قراءة وتنزيل فقط.
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { FolderArchive, AlertCircle } from 'lucide-react';
import ArchiveFilters from '@/components/archive/ArchiveFilters';
import ArchiveDocumentList from '@/components/archive/ArchiveDocumentList';
import ArchivePdfPreviewDialog from '@/components/archive/ArchivePdfPreviewDialog';
import { useArchiveViewPage } from '@/hooks/page/beneficiary/views/useArchiveViewPage';

const ArchiveViewPage = () => {
  const a = useArchiveViewPage();

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
          description="الوثائق الرسمية للوقف المتاحة للاطلاع والتنزيل"
          icon={FolderArchive}
        />

        <ArchiveFilters
          category={a.category} onCategoryChange={a.setCategory}
          search={a.search} onSearchChange={a.setSearch}
        />

        <ArchiveDocumentList
          documents={a.documents}
          isLoading={a.isLoading}
          canWrite={false}
          onPreview={a.handlePreview}
          onDownload={a.handleDownload}
          emptyMessage="لا توجد وثائق منشورة حالياً."
        />
      </div>

      <ArchivePdfPreviewDialog
        target={a.previewTarget}
        url={a.previewUrl}
        onClose={a.closePreview}
        onDownload={a.handleDownload}
      />
    </DashboardLayout>
  );
};

export default ArchiveViewPage;
