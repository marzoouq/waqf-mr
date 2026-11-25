/**
 * فاحص أزرار JSX — مصدر واحد لمعيار «زر بدون معالج» و«زر أيقونة بدون عنوان».
 * يُستهلك من فحص التفاعلات في لوحة التشخيص ومن حارس الاختبارات،
 * حتى لا يتعارض ما تراه الشاشة مع ما يفرضه الاختبار.
 */

export interface ButtonTag {
  tag: string;
  start: number;
}

/**
 * يستخرج وسوم <Button> الافتتاحية مع احترام الأقواس `{}` والاقتباسات
 * حتى لا ينقطع المسح عند `=>` داخل onClick.
 * يعيد كل وسم مع موضع بدايته في المصدر لفحص السياق المحيط.
 */
export function extractButtonTags(source: string): ButtonTag[] {
  const out: ButtonTag[] = [];
  const re = /<Button\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const start = m.index;
    let i = m.index + m[0].length;
    let braceDepth = 0;
    let quote: string | null = null;
    while (i < source.length) {
      const ch = source[i];
      if (quote) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === quote) quote = null;
      } else if (braceDepth > 0) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
        else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      } else {
        if (ch === '{') braceDepth++;
        else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
        else if (ch === '>') { out.push({ tag: source.slice(start, i + 1), start }); break; }
      }
      i++;
    }
  }
  return out;
}

const HANDLED_PARENTS = [
  /<Link\b[^>]*>\s*$/,
  /asChild\b[^<]*>\s*$/,
];

/**
 * هل الأب المباشر يجعل الزر معالَجاً؟
 * تشترط القاعدة أن يلي `asChild>` الزرَّ مباشرة — التغليف بشرط شرطي
 * بين `<Trigger asChild>` والزر لا يُحتسب، لأن Radix يحتاج child واحدًا مباشرًا.
 */
export function hasHandledParent(source: string, start: number): boolean {
  const ctx = source.slice(Math.max(0, start - 300), start);
  return HANDLED_PARENTS.some((re) => re.test(ctx));
}

function isSelfHandled(tag: string): boolean {
  return (
    /onClick\s*=/.test(tag) ||
    /type\s*=\s*["'`]submit["'`]/.test(tag) ||
    /\basChild\b/.test(tag) ||
    /\bdisabled\b/.test(tag)
  );
}

/** الأزرار التي لا معالج لها ولا أب يعالجها — تعيد نصوص الوسوم المخالفة. */
export function findHandlerLessButtons(source: string): string[] {
  return extractButtonTags(source)
    .filter(({ tag, start }) => !isSelfHandled(tag) && !hasHandledParent(source, start))
    .map(({ tag }) => tag);
}

/** أزرار الأيقونات التي لا تحمل aria-label ولا أبًا Link معنونا. */
export function findIconButtonsMissingAria(source: string): string[] {
  return extractButtonTags(source)
    .filter(({ tag, start }) => {
      if (!/size=["'`]icon["'`]/.test(tag)) return false;
      if (/aria-label\s*=/.test(tag)) return false;
      const ctx = source.slice(Math.max(0, start - 300), start);
      if (/<Link\b[^>]*aria-label\s*=[^>]*>\s*$/.test(ctx)) return false;
      return true;
    })
    .map(({ tag }) => tag);
}
