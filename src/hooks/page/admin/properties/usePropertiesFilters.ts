/**
 * هوك فلاتر صفحة العقارات: search/type/occupancy + pagination
 * مُستخرَج من usePropertiesPage لفصل المسؤوليات.
 */
import { useState, useMemo } from 'react';
import type { Property } from '@/types/database';
import { PROPERTIES_PAGE_SIZE } from '@/constants/pagination';

interface Args {
  properties: Property[];
  propertyOccupancy: Map<string, number>;
}

export function usePropertiesFilters({ properties, propertyOccupancy }: Args) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const uniqueTypes = useMemo(() => {
    const types = new Set(properties.map(p => p.property_type));
    return Array.from(types).sort();
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.property_number.toLowerCase().includes(q) && !p.property_type.toLowerCase().includes(q) &&
          !p.location.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
      }
      if (typeFilter !== 'all' && p.property_type !== typeFilter) return false;
      if (occupancyFilter !== 'all') {
        const occ = propertyOccupancy.get(p.id) ?? 0;
        if (occupancyFilter === 'full' && occ < 100) return false;
        if (occupancyFilter === 'partial' && (occ <= 0 || occ >= 100)) return false;
        if (occupancyFilter === 'empty' && occ > 0) return false;
      }
      return true;
    });
  }, [properties, searchQuery, typeFilter, occupancyFilter, propertyOccupancy]);

  return {
    searchQuery, setSearchQuery,
    typeFilter, setTypeFilter,
    occupancyFilter, setOccupancyFilter,
    currentPage, setCurrentPage,
    ITEMS_PER_PAGE: PROPERTIES_PAGE_SIZE,
    uniqueTypes,
    filteredProperties,
  };
}
