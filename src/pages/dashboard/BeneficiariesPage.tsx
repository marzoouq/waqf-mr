import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from '@/hooks/useBeneficiaries';
import { Beneficiary } from '@/types/database';
import { Users, Percent, Search } from 'lucide-react';
import { generateBeneficiariesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import ExportMenu from '@/components/ExportMenu';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TablePagination from '@/components/TablePagination';
import BeneficiaryFormDialog, { BeneficiaryFormData } from '@/components/beneficiaries/BeneficiaryFormDialog';
import BeneficiaryCard from '@/components/beneficiaries/BeneficiaryCard';

const ITEMS_PER_PAGE = 9;

interface AuthUser { id: string; email: string; }

const BeneficiariesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: beneficiaries = [], isLoading } = useBeneficiaries();
  const createBeneficiary = useCreateBeneficiary();
  const updateBeneficiary = useUpdateBeneficiary();
  const deleteBeneficiary = useDeleteBeneficiary();

  const { data: users = [] } = useQuery({
    queryKey: ['beneficiary-users'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list_users' },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      const allUsers: AuthUser[] = (data?.users || []).map((u: { id: string; email?: string }) => ({ id: u.id, email: u.email || u.id }));
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'beneficiary');
      const beneficiaryIds = new Set((roles || []).map((r: { user_id: string }) => r.user_id));
      return allUsers.filter(u => beneficiaryIds.has(u.id));
    },
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<BeneficiaryFormData>({
    name: '', share_percentage: '', phone: '', email: '', bank_account: '', notes: '', user_id: '', national_id: '',
  });

  const availableUsers = useMemo(() => {
    const linkedUserIds = new Set(
      beneficiaries.filter(b => b.user_id && b.id !== editingBeneficiary?.id).map(b => b.user_id)
    );
    return users.filter(u => !linkedUserIds.has(u.id));
  }, [users, beneficiaries, editingBeneficiary]);

  const resetForm = () => {
    setFormData({ name: '', share_percentage: '', phone: '', email: '', bank_account: '', notes: '', user_id: '', national_id: '' });
    setEditingBeneficiary(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.share_percentage) { toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    const newPercentage = parseFloat(formData.share_percentage);
    const currentTotal = beneficiaries
      .filter(b => b.id !== editingBeneficiary?.id)
      .reduce((sum, b) => sum + Number(b.share_percentage), 0);
    if (currentTotal + newPercentage > 100) { toast.error('مجموع نسب المستفيدين يتجاوز 100%'); return; }
    const beneficiaryData = {
      name: formData.name, share_percentage: parseFloat(formData.share_percentage),
      phone: formData.phone || undefined, email: formData.email || undefined,
      bank_account: formData.bank_account || undefined, notes: formData.notes || undefined,
      user_id: formData.user_id || undefined, national_id: formData.national_id || undefined,
    };
    if (editingBeneficiary) { await updateBeneficiary.mutateAsync({ id: editingBeneficiary.id, ...beneficiaryData }); } else { await createBeneficiary.mutateAsync(beneficiaryData); }
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setFormData({
      name: beneficiary.name, share_percentage: beneficiary.share_percentage.toString(),
      phone: beneficiary.phone || '', email: beneficiary.email || '',
      bank_account: beneficiary.bank_account || '', notes: beneficiary.notes || '',
      user_id: beneficiary.user_id || '', national_id: beneficiary.national_id || '',
    });
    setIsOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteBeneficiary.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const totalPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);

  const filteredBeneficiaries = beneficiaries.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.name.toLowerCase().includes(q) || (b.phone || '').includes(q) || (b.email || '').toLowerCase().includes(q) || (b.national_id || '').includes(q);
  });

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">إدارة المستفيدين</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">عرض وإدارة المستفيدين من الوقف</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportMenu onExportPdf={() => generateBeneficiariesPDF(beneficiaries, pdfWaqfInfo)} />
            <BeneficiaryFormDialog
              isOpen={isOpen} setIsOpen={setIsOpen} formData={formData} setFormData={setFormData}
              isEditing={!!editingBeneficiary} isPending={createBeneficiary.isPending || updateBeneficiary.isPending}
              availableUsers={availableUsers} onSubmit={handleSubmit} onReset={resetForm}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3 sm:p-6 flex items-center gap-2 sm:gap-4">
                  <Skeleton className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center"><Users className="w-4 h-4 sm:w-6 sm:h-6 text-primary" /></div>
                  <div><p className="text-[10px] sm:text-sm text-muted-foreground">عدد المستفيدين</p><p className="text-xl sm:text-3xl font-bold">{beneficiaries.length}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 bg-secondary/20 rounded-xl flex items-center justify-center"><Percent className="w-4 h-4 sm:w-6 sm:h-6 text-secondary" /></div>
                  <div><p className="text-[10px] sm:text-sm text-muted-foreground">مجموع النسب</p><p className="text-xl sm:text-3xl font-bold">{totalPercentage.toFixed(2)}%</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث في المستفيدين..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
        </div>

        {isLoading ? (
          <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
        ) : filteredBeneficiaries.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد مستفيدين مسجلين'}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBeneficiaries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((beneficiary) => (
                <BeneficiaryCard
                  key={beneficiary.id}
                  beneficiary={beneficiary}
                  onEdit={handleEdit}
                  onDelete={(id, name) => setDeleteTarget({ id, name })}
                />
              ))}
            </div>
            <TablePagination currentPage={currentPage} totalItems={filteredBeneficiaries.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
          </>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف {deleteTarget?.name} نهائياً ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default BeneficiariesPage;
