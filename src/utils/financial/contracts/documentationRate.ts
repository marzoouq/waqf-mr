/**
 * حساب نسبة توثيق المصروفات (مُستخرج من useExpensesPage في الموجة 18)
 *
 * مصروف يُعتبر "موثقاً" إذا ارتبط بفاتورة ZATCA واحدة على الأقل.
 */

interface InvoiceLike {
  expense_id?: string | null;
}

interface ExpenseLike {
  id: string;
}

export interface DocumentationStats {
  /** خريطة معرّف المصروف → عدد الفواتير المرتبطة */
  expenseInvoiceMap: Map<string, number>;
  /** عدد المصروفات الموثقة (لها فاتورة واحدة على الأقل) */
  documentedCount: number;
  /** نسبة التوثيق المئوية (0-100) — مُقربة لأقرب صحيح */
  documentationRate: number;
}

/**
 * يبني خريطة الفواتير لكل مصروف ويحسب نسبة التوثيق.
 * يُرجع 0% إذا لم تكن هناك مصروفات.
 */
export function computeDocumentationStats(
  expenses: ExpenseLike[],
  invoices: InvoiceLike[],
): DocumentationStats {
  const expenseInvoiceMap = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.expense_id) {
      expenseInvoiceMap.set(inv.expense_id, (expenseInvoiceMap.get(inv.expense_id) ?? 0) + 1);
    }
  }

  const documentedCount = expenses.filter((e) => expenseInvoiceMap.has(e.id)).length;
  const documentationRate = expenses.length > 0
    ? Math.round((documentedCount / expenses.length) * 100)
    : 0;

  return { expenseInvoiceMap, documentedCount, documentationRate };
}
