import type jsPDF from 'jspdf';

/**
 * Safely retrieves the Y position after the last autoTable render.
 * Centralizes the `lastAutoTable` typing to avoid `as any` across PDF utils.
 */
export const getLastAutoTableY = (doc: jsPDF, fallback = 90): number =>
  ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback);
