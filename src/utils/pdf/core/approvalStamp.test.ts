import { describe, it, expect, vi } from 'vitest';
import type jsPDF from 'jspdf';
import { addApprovalStamp } from './approvalStamp';

const fakeDoc = () => {
  const calls: string[] = [];
  const handler: ProxyHandler<object> = {
    get: (_t, prop: string) => {
      if (prop === 'internal') return { pageSize: { width: 210, height: 297 } };
      if (prop === 'getTextWidth') return () => 10;
      return (...args: unknown[]) => { calls.push(`${prop}:${JSON.stringify(args).slice(0, 40)}`); };
    },
  };
  return { doc: new Proxy({}, handler) as unknown as jsPDF, calls };
};

describe('كتلة اعتماد الناظر والختم', () => {
  it('تبقى في الصفحة نفسها عند اتساع المساحة', () => {
    const { doc, calls } = fakeDoc();
    expect(addApprovalStamp(doc, 'Amiri', { waqfName: 'وقف' }, 100)).toBe(156);
    expect(calls.some(c => c.startsWith('addPage'))).toBe(false);
    expect(calls.filter(c => c.startsWith('circle')).length).toBeGreaterThan(3);
  });
  it('تنتقل لصفحة جديدة بدل التداخل مع التذييل', () => {
    const { doc, calls } = fakeDoc();
    addApprovalStamp(doc, 'Amiri', undefined, 240);
    expect(calls.some(c => c.startsWith('addPage'))).toBe(true);
  });
  it('لا تعتمد على ألوان الشاشة', () => {
    vi.stubGlobal('getComputedStyle', () => { throw new Error('must not read theme'); });
    const { doc } = fakeDoc();
    expect(() => addApprovalStamp(doc, 'Amiri', undefined, 50)).not.toThrow();
    vi.unstubAllGlobals();
  });
});
