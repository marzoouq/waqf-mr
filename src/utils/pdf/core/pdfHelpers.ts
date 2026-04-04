import type jsPDF from 'jspdf';

/** واجهة jsPDF مع بيانات autoTable */
interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

/**
 * Safely retrieves the Y position after the last autoTable render.
 * Centralizes the `lastAutoTable` typing to avoid `as any` across PDF utils.
 */
export const getLastAutoTableY = (doc: jsPDF, fallback = 90): number =>
  (doc as JsPDFWithAutoTable).lastAutoTable?.finalY ?? fallback;
