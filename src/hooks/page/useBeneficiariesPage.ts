import { useState, useMemo } from 'react';
import { useBeneficiaries, useBeneficiariesDecrypted, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from '@/hooks/data/useBeneficiaries';
import { useBeneficiaryUsers } from '@/hooks/data/useBeneficiaryUsers';
import { Beneficiary } from '@/types/database';
import { toast } from 'sonner';
import type { BeneficiaryFormData } from '@/components/beneficiaries';

const ITEMS_PER_PAGE = 9;

export function useBeneficiariesPage() {
  const beneficiariesQuery = useBeneficiaries();
  const { data: beneficiaries = [], isLoading } = beneficiariesQuery;
  const { data: decryptedBeneficiaries = [] } = useBeneficiariesDecrypted();
  const createBeneficiary = useCreateBeneficiary();
  const updateBeneficiary = useUpdateBeneficiary();
  const deleteBeneficiary = useDeleteBeneficiary();

  const [isOpen, setIsOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<BeneficiaryFormData>({
    name: '', share_percentage: '', phone: '', email: '', bank_account: '', notes: '', user_id: '', national_id: '',
  });

  // جلب المستخدمين المتاحين للربط
  const { data: users = [] } = useBeneficiaryUsers(isOpen);

  const availableUsers = useMemo(() => {
    const linkedUserIds = new Set(
      beneficiaries.filter(b => b.user_id && b.id !== editingBeneficiary?.id).map(b => b.user_id)
    );
    return users.filter((u: { id: string }) => !linkedUserIds.has(u.id));
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
    try {
      if (editingBeneficiary) {
        await updateBeneficiary.mutateAsync({ id: editingBeneficiary.id, ...beneficiaryData });
      } else {
        await createBeneficiary.mutateAsync(beneficiaryData);
      }
      setIsOpen(false);
      resetForm();
    } catch { /* mutationCache handles toast */ }
  };

  const handleEdit = (beneficiary: Beneficiary) => {
    const decrypted = decryptedBeneficiaries.find(b => b.id === beneficiary.id);
    const source = decrypted || beneficiary;
    setEditingBeneficiary(beneficiary);
    setFormData({
      name: source.name, share_percentage: source.share_percentage.toString(),
      phone: source.phone || '', email: source.email || '',
      bank_account: source.bank_account || '', notes: source.notes || '',
      user_id: source.user_id || '', national_id: source.national_id || '',
    });
    setIsOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteBeneficiary.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setCurrentPage(1);
  };

  const totalPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);
  const activeBeneficiaries = beneficiaries.filter(b => Number(b.share_percentage) > 0).length;
  const percentageExceeds = totalPercentage > 100;

  const filteredBeneficiaries = useMemo(() => {
    if (!searchQuery) return beneficiaries;
    const q = searchQuery.toLowerCase();
    return beneficiaries.filter(b =>
      b.name.toLowerCase().includes(q) || (b.phone || '').includes(q) || (b.email || '').toLowerCase().includes(q) || (b.national_id || '').includes(q)
    );
  }, [beneficiaries, searchQuery]);

  return {
    beneficiaries, isLoading, filteredBeneficiaries,
    isOpen, setIsOpen, editingBeneficiary, formData, setFormData,
    availableUsers, resetForm, handleSubmit, handleEdit,
    isPending: createBeneficiary.isPending || updateBeneficiary.isPending,
    deleteTarget, setDeleteTarget, handleConfirmDelete,
    searchQuery, setSearchQuery, currentPage, setCurrentPage, ITEMS_PER_PAGE,
    totalPercentage, activeBeneficiaries, percentageExceeds,
    serverPage: beneficiariesQuery.page,
    serverNextPage: beneficiariesQuery.nextPage,
    serverPrevPage: beneficiariesQuery.prevPage,
    serverHasNextPage: beneficiariesQuery.hasNextPage,
    serverHasPrevPage: beneficiariesQuery.hasPrevPage,
    serverPageSize: beneficiariesQuery.pageSize,
  };
}
