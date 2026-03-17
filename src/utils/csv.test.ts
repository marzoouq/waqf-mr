import { describe, it, expect } from 'vitest';
import { sanitizeCsvValue, normalizeCsvDirection, buildCsv, buildCsvFromRows } from './csv';

const RLM = '\u200F';
const LRM = '\u200E';

describe('sanitizeCsvValue', () => {
  it('يضيف فاصلة عليا قبل صيغة تبدأ بـ =', () => {
    expect(sanitizeCsvValue('=SUM(A1)')).toBe("'=SUM(A1)");
  });
  it('يضيف فاصلة عليا قبل + و - و @', () => {
    expect(sanitizeCsvValue('+cmd')).toBe("'+cmd");
    expect(sanitizeCsvValue('-cmd')).toBe("'-cmd");
    expect(sanitizeCsvValue('@SUM')).toBe("'@SUM");
  });
  it('لا يعدّل القيم العادية', () => {
    expect(sanitizeCsvValue('مرحبا')).toBe('مرحبا');
    expect(sanitizeCsvValue('123')).toBe('123');
  });
});

describe('normalizeCsvDirection', () => {
  it('يغلّف النص العربي بعلامة RLM', () => {
    const result = normalizeCsvDirection('فاتورة');
    expect(result).toBe(RLM + 'فاتورة' + RLM);
  });
  it('يغلّف نص مختلط بعلامة RLM', () => {
    const result = normalizeCsvDirection('فاتورة رقم 123');
    expect(result).toBe(RLM + 'فاتورة رقم 123' + RLM);
  });
  it('يغلّف الأرقام اللاتينية بعلامة LRM', () => {
    const result = normalizeCsvDirection('2026-03-17');
    expect(result).toBe(LRM + '2026-03-17' + LRM);
  });
  it('يغلّف المعرّفات اللاتينية بعلامة LRM', () => {
    const result = normalizeCsvDirection('A-12');
    expect(result).toBe(LRM + 'A-12' + LRM);
  });
  it('يعيد القيمة الفارغة كما هي', () => {
    expect(normalizeCsvDirection('')).toBe('');
  });
});

describe('buildCsv', () => {
  it('يبني CSV بترتيب أعمدة صحيح مع BOM', () => {
    const data = [{ name: 'وقف', amount: 1000, date: '2026-01-01' }];
    const csv = buildCsv(data, ['name', 'amount', 'date']);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('name');
    expect(csv).toContain('1000');
  });
  it('يعيد سلسلة فارغة لمصفوفة فارغة', () => {
    expect(buildCsv([])).toBe('');
  });
  it('يحمي من CSV injection', () => {
    const data = [{ val: '=SUM(A1)' }];
    const csv = buildCsv(data);
    expect(csv).toContain("'=SUM(A1)");
  });
});

describe('buildCsvFromRows', () => {
  it('يبني CSV من عناوين وصفوف', () => {
    const csv = buildCsvFromRows(['الاسم', 'المبلغ'], [['أحمد', '500'], ['سارة', null]]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('أحمد');
    // null تُحوّل إلى سلسلة فارغة
    expect(csv.split('\n')).toHaveLength(3);
  });
});
