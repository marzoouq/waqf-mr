/**
 * أنواع تقرير المتأخرات — مُستخرَجة لتفعيل Fast Refresh
 */
export interface OverdueRowData {
  contractNumber: string;
  tenantName: string;
  propertyNumber: string;
  overdueCount: number;
  totalOverdue: number;
  maxDays: number;
  oldestDue: string;
  severity: string;
}
