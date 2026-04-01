import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { BylawAddDialog, BylawEditDialog, BylawDeleteDialog } from '@/components/bylaws/BylawDialogs';
import SortableBylawItem from '@/components/bylaws/SortableBylawItem';
import { Loader2, BookOpen, Eye, EyeOff, Search, X, Plus, Globe, Lock, Scale, FileText } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';

import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Switch } from '@/components/ui/switch';
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

        {/* Stats & Publish Control */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">إجمالي البنود</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.visible}</p>
                <p className="text-xs text-muted-foreground">بنود ظاهرة</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.hidden}</p>
                <p className="text-xs text-muted-foreground">بنود مخفية</p>
              </div>
            </div>
          </Card>
          <Card className={`p-4 border-2 transition-colors ${isPublished ? 'border-primary/30 bg-accent' : 'border-destructive/30 bg-destructive/5'}`}>
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPublished ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                  {isPublished ? <Globe className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-destructive" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{isPublished ? 'منشورة' : 'محجوبة'}</p>
                  <p className="text-xs text-muted-foreground">{isPublished ? 'متاحة للمستفيدين' : 'مخفية عن المستفيدين'}</p>
                </div>
              </div>
              <Switch checked={isPublished} onCheckedChange={togglePublish} />
            </div>
          </Card>
        </div>

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
