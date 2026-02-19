import { useMemo, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useBylaws, BylawEntry } from '@/hooks/useBylaws';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Loader2, Pencil, BookOpen, Eye, EyeOff, Search, X, GripVertical, Plus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ExportMenu from '@/components/ExportMenu';
import { generateBylawsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableBylawItemProps {
  item: BylawEntry;
  openEdit: (item: BylawEntry) => void;
  toggleVisibility: (item: BylawEntry) => void;
  onDelete: (item: BylawEntry) => void;
  isDragDisabled: boolean;
}

const SortableBylawItem = ({ item, openEdit, toggleVisibility, onDelete, isDragDisabled }: SortableBylawItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={item.id} className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 flex-1 text-right">
            {!isDragDisabled && (
              <button
                className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted text-muted-foreground"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            <Badge variant={item.is_visible ? 'default' : 'secondary'} className="shrink-0">
              {item.part_number === 0 ? 'مقدمة' : `جزء ${item.part_number}`}
            </Badge>
            <span className="font-semibold text-sm">
              {item.chapter_title || item.part_title}
            </span>
            {!item.is_visible && (
              <Badge variant="outline" className="text-muted-foreground shrink-0">
                <EyeOff className="w-3 h-3 ml-1" /> مخفي
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pt-2 pb-4 space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none text-right leading-relaxed" dir="rtl">
              <ReactMarkdown>{item.content}</ReactMarkdown>
            </div>
            <div className="flex items-center justify-between pt-3 border-t print:hidden">
              <div className="flex items-center gap-3">
                <Switch
                  checked={item.is_visible}
                  onCheckedChange={() => toggleVisibility(item)}
                />
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {item.is_visible ? 'ظاهر للمستفيدين' : 'مخفي عن المستفيدين'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onDelete(item)} className="gap-2 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">حذف</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(item)} className="gap-2">
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">تعديل</span>
                </Button>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

const BylawsPage = () => {
  const { data: bylaws, isLoading, updateBylaw, reorderBylaws, createBylaw, deleteBylaw } = useBylaws();
  const pdfWaqfInfo = usePdfWaqfInfo();
  const [editItem, setEditItem] = useState<BylawEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState<BylawEntry | null>(null);
  const [newBylaw, setNewBylaw] = useState({ part_title: '', chapter_title: '', content: '', part_number: 0 });

  const allBylaws = bylaws || [];

  const visibleBylaws = useMemo(() => {
    if (!search.trim()) return allBylaws;
    const q = search.trim().toLowerCase();
    return allBylaws.filter(
      (b) =>
        b.part_title.toLowerCase().includes(q) ||
        (b.chapter_title && b.chapter_title.toLowerCase().includes(q)) ||
        b.content.toLowerCase().includes(q),
    );
  }, [allBylaws, search]);

  const isSearching = search.trim().length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = allBylaws.findIndex((b) => b.id === active.id);
      const newIndex = allBylaws.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(allBylaws, oldIndex, newIndex);
      const updates = reordered.map((item, idx) => ({ id: item.id, sort_order: idx }));
      reorderBylaws.mutate(updates);
    },
    [allBylaws, reorderBylaws],
  );

  const openEdit = (item: BylawEntry) => {
    setEditItem(item);
    setEditContent(item.content);
  };

  const handleSave = () => {
    if (!editItem) return;
    updateBylaw.mutate({ id: editItem.id, content: editContent }, { onSuccess: () => setEditItem(null) });
  };

  const toggleVisibility = (item: BylawEntry) => {
    updateBylaw.mutate({ id: item.id, is_visible: !item.is_visible });
  };

  const handleAdd = () => {
    if (!newBylaw.part_title.trim()) return;
    createBylaw.mutate(
      {
        part_number: newBylaw.part_number,
        part_title: newBylaw.part_title.trim(),
        chapter_title: newBylaw.chapter_title.trim() || undefined,
        content: newBylaw.content.trim(),
        sort_order: allBylaws.length,
      },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setNewBylaw({ part_title: '', chapter_title: '', content: '', part_number: 0 });
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteBylaw.mutate(deleteItem.id, { onSuccess: () => setDeleteItem(null) });
  };

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
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shadow-gold">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">اللائحة التنظيمية</h1>
              <p className="text-sm text-muted-foreground">اسحب البنود لإعادة ترتيبها</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إضافة بند</span>
            </Button>
            <ExportMenu
              onExportPdf={() => generateBylawsPDF(visibleBylaws, pdfWaqfInfo)}
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              بنود اللائحة ({visibleBylaws.length} بند)
              {isSearching && <Badge variant="secondary" className="text-xs">نتائج البحث</Badge>}
              {reorderBylaws.isPending && (
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

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة بند جديد</DialogTitle>
            <DialogDescription>أضف بنداً جديداً إلى اللائحة التنظيمية. يدعم المحتوى تنسيق Markdown.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" dir="rtl">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">رقم الجزء</label>
                <Input
                  type="number"
                  min={0}
                  value={newBylaw.part_number}
                  onChange={(e) => setNewBylaw((p) => ({ ...p, part_number: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">عنوان الجزء *</label>
                <Input
                  value={newBylaw.part_title}
                  onChange={(e) => setNewBylaw((p) => ({ ...p, part_title: e.target.value }))}
                  placeholder="مثال: أحكام عامة"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">عنوان الفصل (اختياري)</label>
              <Input
                value={newBylaw.chapter_title}
                onChange={(e) => setNewBylaw((p) => ({ ...p, chapter_title: e.target.value }))}
                placeholder="مثال: الفصل الأول - التعريفات"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">المحتوى (يدعم Markdown)</label>
              <Textarea
                value={newBylaw.content}
                onChange={(e) => setNewBylaw((p) => ({ ...p, content: e.target.value }))}
                className="min-h-[200px] font-mono text-sm"
                placeholder="اكتب محتوى البند هنا..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>إلغاء</Button>
            <Button onClick={handleAdd} disabled={createBylaw.isPending || !newBylaw.part_title.trim()}>
              {createBylaw.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              إضافة البند
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              تعديل: {editItem?.chapter_title || editItem?.part_title}
            </DialogTitle>
            <DialogDescription>
              يمكنك تعديل المحتوى باستخدام تنسيق Markdown. سيتم تسجيل التعديل في سجل المراجعة.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            dir="rtl"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={updateBylaw.isPending}>
              {updateBylaw.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف البند</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف بند "{deleteItem?.chapter_title || deleteItem?.part_title}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteBylaw.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default BylawsPage;
