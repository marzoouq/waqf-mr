/** Export context and values already prepared for the screen. */
export interface PdfExportContext {
  fiscalYearLabel?: string;
  filterLabel?: string;
  totalRent?: number;
}

export interface PropertyPdfInput {
  property_number: string;
  property_type: string;
  location: string;
  area: number;
  description?: string | null;
  financials?: {
    totalUnits: number;
    occupancy: number;
    contractualRevenue: number;
    totalExpenses: number;
    netIncome: number;
  };
}