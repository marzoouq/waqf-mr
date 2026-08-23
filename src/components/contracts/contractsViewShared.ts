/**
 * أنواع وثوابت مشتركة لعروض العقود (جدول/شبكة/جوال) — تمنع تكرار التعريفات.
 */
export interface ContractItem {
  id: string | null;
  contract_number: string | null;
  tenant_name: string | null;
  property_id?: string | null;
  rent_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
}

export const STATUS_MAP: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  active: { label: 'نشط', variant: 'default' },
  expired: { label: 'منتهي', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'secondary' },
};

export type IsExpiringSoon = (c: { status: string | null; end_date: string | null }) => boolean;
