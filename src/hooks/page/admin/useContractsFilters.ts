import { useState, useMemo, useCallback } from 'react';
import { Contract } from '@/types/database';
import { getPaymentTypeLabel } from '@/utils/financial/contractHelpers';

const getBaseNumber = (num: string) => num.replace(/-R\d+$/, '');

export type StatusFilterValue = 'all' | 'active' | 'expired' | 'cancelled' | 'overdue';

interface UseContractsFiltersParams {
  contracts: Contract[];
  paymentInvoices: { status: string; due_date: string; contract_id: string }[];
}

export const useContractsFilters = ({ contracts, paymentInvoices }: UseContractsFiltersParams) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // تجميع العقود حسب الرقم الأساسي
  const groupedContracts = useMemo(() => {
    const map = new Map<string, Contract[]>();
    for (const c of contracts) {
      const base = getBaseNumber(c.contract_number);
      if (!map.has(base)) map.set(base, []);
      map.get(base)!.push(c);
    }
    for (const [, group] of map) {
      group.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }
    return [...map.entries()].sort((a, b) => {
      const latestA = new Date(a[1][0]!.start_date).getTime();
      const latestB = new Date(b[1][0]!.start_date).getTime();
      return latestB - latestA;
    });
  }, [contracts]);

  // العقود المتأخرة عن السداد > 30 يوم
  const overdueContractIds = useMemo(() => {
    const ids = new Set<string>();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 3600 * 1000;
    for (const inv of paymentInvoices) {
      if (inv.status === 'overdue' || (inv.status === 'pending' && new Date(inv.due_date).getTime() + thirtyDays < now)) {
        ids.add(inv.contract_id);
      }
    }
    return ids;
  }, [paymentInvoices]);

  const statusCounts = useMemo(() => {
    let active = 0, expired = 0, cancelled = 0;
    for (const [, group] of groupedContracts) {
      const latestStatus = group[0]!.status;
      if (latestStatus === 'active') active++;
      else if (latestStatus === 'cancelled') cancelled++;
      else expired++;
    }
    const overdue = groupedContracts.filter(([, group]) => group.some(c => overdueContractIds.has(c.id))).length;
    return { active, expired, cancelled, all: groupedContracts.length, overdue };
  }, [groupedContracts, overdueContractIds]);

  // فلترة المجموعات
  const filteredGroups = useMemo(() => {
    let result = groupedContracts;
    if (statusFilter === 'overdue') {
      result = result.filter(([, group]) => group.some(c => overdueContractIds.has(c.id)));
    } else if (statusFilter !== 'all') {
      result = result.filter(([, group]) => {
        const latestStatus = group[0]!.status;
        if (statusFilter === 'active') return latestStatus === 'active';
        if (statusFilter === 'cancelled') return latestStatus === 'cancelled';
        return latestStatus !== 'active' && latestStatus !== 'cancelled';
      });
    }
    if (propertyFilter !== 'all') {
      result = result.filter(([, group]) => group.some(c => c.property_id === propertyFilter));
    }
    if (paymentTypeFilter !== 'all') {
      result = result.filter(([, group]) => group.some(c => c.payment_type === paymentTypeFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(([, group]) => group.some(c =>
        c.contract_number.toLowerCase().includes(q) || c.tenant_name.toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q) || getPaymentTypeLabel(c.payment_type).includes(q)
      ));
    }
    return result;
  }, [groupedContracts, searchQuery, statusFilter, propertyFilter, paymentTypeFilter, overdueContractIds]);

  const allExpanded = filteredGroups.length > 0 && filteredGroups.every(([base]) => expandedGroups.has(base));
  const toggleAllGroups = useCallback(() => {
    if (allExpanded) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(filteredGroups.map(([base]) => base)));
    }
  }, [allExpanded, filteredGroups]);

  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    propertyFilter, setPropertyFilter,
    paymentTypeFilter, setPaymentTypeFilter,
    expandedGroups, setExpandedGroups,
    groupedContracts, overdueContractIds, statusCounts, filteredGroups,
    allExpanded, toggleAllGroups,
  };
};
