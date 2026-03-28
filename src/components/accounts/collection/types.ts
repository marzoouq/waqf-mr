/**
 * أنواع وواجهات جدول التحصيل
 */
export interface CollectionItem {
  index: number;
  tenantName: string;
  paymentPerPeriod: number;
  expectedPayments: number;
  paidMonths: number;
  totalCollected: number;
  arrears: number;
  status: string;
  notes: string;
  spansMultipleYears?: boolean;
  totalContractPayments?: number;
  allocatedToThisYear?: number;
  allocatedToOtherYears?: number;
  allocationNote?: string;
}

export interface EditData {
  contractId: string;
  tenantName: string;
  monthlyRent: number;
  paidMonths: number;
  status: string;
}

export interface CollectionRowProps {
  item: CollectionItem;
  isEditing: boolean;
  editData: EditData | null;
  setEditData: React.Dispatch<React.SetStateAction<EditData | null>>;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  isUpdatePending: boolean;
  isUpsertPending: boolean;
}
