/**
 * Next free renewal number for a contract: `<base>-R<n>`.
 * يبقى الرقم الأصلي ظاهرًا، ويُضاف رقم نسخة لا يتعارض مع أي عقد موجود.
 */
const RENEWAL_SUFFIX = /-R(\d+)$/;

export const baseContractNumber = (num: string): string => num.replace(RENEWAL_SUFFIX, '');

export const nextRenewalNumber = (current: string, existingNumbers: readonly string[] = []): string => {
  const base = baseContractNumber(current);
  const currentMatch = current.match(RENEWAL_SUFFIX);
  let maxUsed = currentMatch ? parseInt(currentMatch[1]!, 10) : 0;
  for (const n of existingNumbers) {
    if (baseContractNumber(n) !== base) continue;
    const m = n.match(RENEWAL_SUFFIX);
    if (m) maxUsed = Math.max(maxUsed, parseInt(m[1]!, 10));
  }
  return `${base}-R${maxUsed + 1}`;
};
