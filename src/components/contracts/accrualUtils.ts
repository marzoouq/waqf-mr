/**
 * أنواع ووظائف مشتركة بين بطاقات/جداول الاستحقاقات
 */

export interface CellData {
  amount: number;
  status: 'paid' | 'overdue' | 'pending' | 'empty';
}

export interface MonthCell {
  label: string;
  month: number;
  year: number;
}

export const getCellClasses = (status: CellData['status']): string => {
  switch (status) {
    case 'paid': return 'bg-success/10 text-success font-medium';
    case 'overdue': return 'bg-destructive/10 text-destructive font-medium';
    case 'pending': return 'text-foreground font-medium';
    case 'empty': return 'text-muted-foreground/40';
  }
};
