/** Plain report content prepared by its page hook; no calculations in the PDF. */
export interface SummaryPdfData {
  title: string;
  subtitle?: string;
  filename: string;
  rows: Array<[string, string]>;
}