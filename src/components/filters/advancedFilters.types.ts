export interface FilterState {
  category: string;
  propertyId: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: FilterState = {
  category: '',
  propertyId: '',
  dateFrom: '',
  dateTo: '',
};