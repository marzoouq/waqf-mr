/**
 * Annual Report types — shared between hooks/data, hooks/page, pages, and components.
 * Lives in src/types/ to keep dependency direction correct (UI/hooks → types).
 */

export type SectionType = 'achievement' | 'challenge' | 'future_plan' | 'property_status';

export interface AnnualReportItem {
  id: string;
  fiscal_year_id: string;
  section_type: string;
  title: string;
  content: string;
  property_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AnnualReportStatus {
  id: string;
  fiscal_year_id: string;
  status: string;
  published_at: string | null;
  created_at: string;
}
