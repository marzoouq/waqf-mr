import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PerformanceMonitorTab from './PerformanceMonitorTab';
import * as perfMonitor from '@/lib/performanceMonitor';

// Mock performanceMonitor
vi.mock('@/lib/performanceMonitor', () => ({
  getSlowQueries: vi.fn(() => []),
  clearSlowQueries: vi.fn(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock performance API
const mockNavEntry = {
  startTime: 0,
  loadEventEnd: 1200,
  domInteractive: 800,
  responseStart: 50,
  requestStart: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([mockNavEntry as unknown as PerformanceEntry]);
});

describe('PerformanceMonitorTab', () => {
  it('يعرض بطاقات المقاييس الأربع', () => {
    render(<PerformanceMonitorTab />);
    expect(screen.getByText('تحميل الصفحة')).toBeInTheDocument();
    expect(screen.getByText('DOM Interactive')).toBeInTheDocument();
    expect(screen.getByText('TTFB')).toBeInTheDocument();
    expect(screen.getByText('عناصر DOM')).toBeInTheDocument();
  });

  it('يعرض أزرار التحكم', () => {
    render(<PerformanceMonitorTab />);
    expect(screen.getByText('تحديث المقاييس')).toBeInTheDocument();
    expect(screen.getByText('مسح السجل')).toBeInTheDocument();
  });

  it('يعرض رسالة "لا توجد استعلامات بطيئة" عندما القائمة فارغة', () => {
    render(<PerformanceMonitorTab />);
    expect(screen.getByText(/لا توجد استعلامات بطيئة/)).toBeInTheDocument();
  });

  it('يعرض جدول الاستعلامات البطيئة عند وجود بيانات', () => {
    vi.mocked(perfMonitor.getSlowQueries).mockReturnValue([
      { label: 'fetch_contracts', startTime: 0, endTime: 4500, durationMs: 4500 },
      { label: 'fetch_invoices', startTime: 0, endTime: 3200, durationMs: 3200 },
    ]);

    render(<PerformanceMonitorTab />);
    // Mobile + Desktop both render, so use getAllByText
    expect(screen.getAllByText('fetch_contracts').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('fetch_invoices').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('4500ms').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3200ms').length).toBeGreaterThanOrEqual(1);
  });

  it('يعرض Badge بعدد الاستعلامات البطيئة', () => {
    vi.mocked(perfMonitor.getSlowQueries).mockReturnValue([
      { label: 'slow_op', startTime: 0, endTime: 5000, durationMs: 5000 },
    ]);

    render(<PerformanceMonitorTab />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('يستدعي clearSlowQueries عند الضغط على "مسح السجل"', () => {
    render(<PerformanceMonitorTab />);
    fireEvent.click(screen.getByText('مسح السجل'));
    expect(perfMonitor.clearSlowQueries).toHaveBeenCalled();
  });

  it('يحدّث المقاييس عند الضغط على "تحديث المقاييس"', () => {
    render(<PerformanceMonitorTab />);
    fireEvent.click(screen.getByText('تحديث المقاييس'));
    // collectMetrics calls getEntriesByType again
    expect(performance.getEntriesByType).toHaveBeenCalledWith('navigation');
  });

  it('يعرض قيم المقاييس من Navigation Timing API', () => {
    render(<PerformanceMonitorTab />);
    // loadTime = 1200, domInteractive = 800, ttfb = 40
    expect(screen.getByText(/1200/)).toBeInTheDocument();
    expect(screen.getByText(/800/)).toBeInTheDocument();
    expect(screen.getByText(/40/)).toBeInTheDocument();
  });
});
