import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { BylawAddDialog, BylawEditDialog, BylawDeleteDialog } from '@/components/bylaws/BylawDialogs';
import BylawsStatsCards from '@/components/bylaws/BylawsStatsCards';
import SortableBylawItem from '@/components/bylaws/SortableBylawItem';
import { Loader2, BookOpen, Search, X, Plus, Lock, Scale } from 'lucide-react';
import { ExportMenu } from '@/components/common';
import { generateBylawsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';

import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useBylawsPage } from '@/hooks/page/useBylawsPage';

const BylawsPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const {
    isLoading, visibleBylaws, isSearching, stats, isPublished,
    sensors, handleDragEnd,
    search, setSearch,
    showAddDialog, setShowAddDialog,
    newBylaw, setNewBylaw, handleAdd, createBylawPending,
    editItem, setEditItem,
    editContent, setEditContent,
    editPartNumber, setEditPartNumber,
    editPartTitle, setEditPartTitle,
    editChapterTitle, setEditChapterTitle,
    editChapterNumber, setEditChapterNumber,
    openEdit, handleSave, updateBylawPending,
    deleteItem, setDeleteItem, handleDelete, deleteBylawPending,
    toggleVisibility, togglePublish,
    reorderPending,
  } = useBylawsPage();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeaderCard
          title="اللائحة التنظيمية"
          description="إدارة وتنظيم لائحة أعمال الوقف والنظارة"
          icon={Scale}
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowAddDialog(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">إضافة بند</span>
              </Button>
              <ExportMenu
                onExportPdf={() => generateBylawsPDF(visibleBylaws, pdfWaqfInfo)}
              />
            </div>
          }
        />

        {!isPublished && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-warning/40 bg-warning/5 text-warning text-sm">
            <Lock className="w-5 h-5 shrink-0" />
            <span>اللائحة التنظيمية <strong>محجوبة</strong> حالياً عن المستفيدين. قم بتفعيل النشر أدناه لإتاحتها.</span>
          </div>
        )}

        <BylawsStatsCards stats={stats} isPublished={isPublished} togglePublish={togglePublish} />

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="bylaws-search"
            name="bylaws-search"
            aria-label="بحث"
            placeholder="ابحث في بنود اللائحة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 pl-9"
            dir="rtl"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bylaws with DnD */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              بنود اللائحة ({visibleBylaws.length} بند)
              {isSearching && <Badge variant="secondary" className="text-xs">نتائج البحث</Badge>}
              {!isSearching && <Badge variant="outline" className="text-xs text-muted-foreground">اسحب لإعادة الترتيب</Badge>}
              {reorderPending && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> جاري حفظ الترتيب...
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleBylaws.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <Accordion type="multiple" className="space-y-2">
                  {visibleBylaws.map((item) => (
                    <SortableBylawItem
                      key={item.id}
                      item={item}
                      openEdit={openEdit}
                      toggleVisibility={toggleVisibility}
                      onDelete={setDeleteItem}
                      isDragDisabled={isSearching}
                    />
                  ))}
                </Accordion>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      </div>

      <BylawAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        newBylaw={newBylaw}
        setNewBylaw={setNewBylaw}
        onAdd={handleAdd}
        isPending={createBylawPending}
      />

      <BylawEditDialog
        editItem={editItem}
        onClose={() => setEditItem(null)}
        editContent={editContent}
        setEditContent={setEditContent}
        editPartNumber={editPartNumber}
        setEditPartNumber={setEditPartNumber}
        editPartTitle={editPartTitle}
        setEditPartTitle={setEditPartTitle}
        editChapterTitle={editChapterTitle}
        setEditChapterTitle={setEditChapterTitle}
        editChapterNumber={editChapterNumber}
        setEditChapterNumber={setEditChapterNumber}
        onSave={handleSave}
        isPending={updateBylawPending}
      />

      <BylawDeleteDialog
        deleteItem={deleteItem}
        onClose={() => setDeleteItem(null)}
        onDelete={handleDelete}
        isPending={deleteBylawPending}
      />
    </DashboardLayout>
  );
};

export default BylawsPage;
