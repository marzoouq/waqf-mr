/**
 * تحويل المبالغ المالية إلى نطاقات مجمّعة لحماية خصوصية المستفيدين.
 * يُستخدم في المساعد الذكي عندما يكون المستخدم non-admin.
 */
export function toRange(amount: number): string {
  if (amount <= 0) return "0";
  if (amount < 10_000) return "أقل من 10,000";
  if (amount < 50_000) return "10,000 - 50,000";
  if (amount < 100_000) return "50,000 - 100,000";
  if (amount < 500_000) return "100,000 - 500,000";
  if (amount < 1_000_000) return "500,000 - مليون";
  return "أكثر من مليون";
}
