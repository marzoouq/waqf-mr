import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportMenu from './ExportMenu';

describe('ExportMenu', () => {
  it('renders dropdown with both print and PDF options by default', () => {
    render(<ExportMenu onPrint={vi.fn()} onExportPdf={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('تصدير')).toBeInTheDocument();
  });

  it('renders single PDF button when hidePrint is true', () => {
    render(<ExportMenu hidePrint onExportPdf={vi.fn()} />);
    expect(screen.getByText('تصدير PDF')).toBeInTheDocument();
    expect(screen.queryByText('تصدير')).not.toBeInTheDocument();
  });

  it('renders single print button when hidePdf is true', () => {
    render(<ExportMenu hidePdf onPrint={vi.fn()} />);
    expect(screen.getByText('طباعة')).toBeInTheDocument();
    expect(screen.queryByText('تصدير')).not.toBeInTheDocument();
  });

  it('calls onPrint when print button is clicked', () => {
    const onPrint = vi.fn();
    render(<ExportMenu hidePdf onPrint={onPrint} />);
    fireEvent.click(screen.getByText('طباعة'));
    expect(onPrint).toHaveBeenCalledOnce();
  });

  it('calls onExportPdf when PDF button is clicked', () => {
    const onExportPdf = vi.fn();
    render(<ExportMenu hidePrint onExportPdf={onExportPdf} />);
    fireEvent.click(screen.getByText('تصدير PDF'));
    expect(onExportPdf).toHaveBeenCalledOnce();
  });

  it('calls window.print when no onPrint provided', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<ExportMenu hidePdf />);
    fireEvent.click(screen.getByText('طباعة'));
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });

  it('renders CSV option when onExportCsv is provided', () => {
    const onExportCsv = vi.fn();
    render(<ExportMenu hidePrint hidePdf onExportCsv={onExportCsv} />);
    expect(screen.getByText('تصدير Excel')).toBeInTheDocument();
  });

  it('calls onExportCsv when CSV button is clicked', () => {
    const onExportCsv = vi.fn();
    render(<ExportMenu hidePrint hidePdf onExportCsv={onExportCsv} />);
    fireEvent.click(screen.getByText('تصدير Excel'));
    expect(onExportCsv).toHaveBeenCalledOnce();
  });

  it('returns null when no options are available', () => {
    const { container } = render(<ExportMenu hidePrint hidePdf />);
    expect(container.firstChild).toBeNull();
  });
});
