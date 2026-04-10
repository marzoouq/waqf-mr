// ═══════════════════════════════════════════════════════════════════════════════
// Arabic Reshaper المشترك — يُستورد من أي وظيفة حافة تحتاج معالجة نص عربي
// ⚠️ تنفيذ يدوي لأن npm arabic-reshaper غير متوفر في بيئة Deno Edge.
//    النسخة المقابلة للعميل في src/utils/pdf/core/arabicReshaper.ts تستخدم npm package.
// ═══════════════════════════════════════════════════════════════════════════════

// Maps Unicode code-points → contextual Presentation Forms-B glyphs
// Format: [isolated, final, initial, medial]
const ARABIC_FORMS: Record<number, number[]> = {
  0x0621: [0xFE80, 0xFE80, 0xFE80, 0xFE80], // ء hamza
  0x0622: [0xFE81, 0xFE82, 0xFE81, 0xFE82], // آ
  0x0623: [0xFE83, 0xFE84, 0xFE83, 0xFE84], // أ
  0x0624: [0xFE85, 0xFE86, 0xFE85, 0xFE86], // ؤ
  0x0625: [0xFE87, 0xFE88, 0xFE87, 0xFE88], // إ
  0x0626: [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C], // ئ
  0x0627: [0xFE8D, 0xFE8E, 0xFE8D, 0xFE8E], // ا
  0x0628: [0xFE8F, 0xFE90, 0xFE91, 0xFE92], // ب
  0x0629: [0xFE93, 0xFE94, 0xFE93, 0xFE94], // ة
  0x062A: [0xFE95, 0xFE96, 0xFE97, 0xFE98], // ت
  0x062B: [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C], // ث
  0x062C: [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0], // ج
  0x062D: [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4], // ح
  0x062E: [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8], // خ
  0x062F: [0xFEA9, 0xFEAA, 0xFEA9, 0xFEAA], // د
  0x0630: [0xFEAB, 0xFEAC, 0xFEAB, 0xFEAC], // ذ
  0x0631: [0xFEAD, 0xFEAE, 0xFEAD, 0xFEAE], // ر
  0x0632: [0xFEAF, 0xFEB0, 0xFEAF, 0xFEB0], // ز
  0x0633: [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4], // س
  0x0634: [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8], // ش
  0x0635: [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC], // ص
  0x0636: [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0], // ض
  0x0637: [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4], // ط
  0x0638: [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8], // ظ
  0x0639: [0xFEC9, 0xFECA, 0xFECB, 0xFECC], // ع
  0x063A: [0xFECD, 0xFECE, 0xFECF, 0xFED0], // غ
  0x0641: [0xFED1, 0xFED2, 0xFED3, 0xFED4], // ف
  0x0642: [0xFED5, 0xFED6, 0xFED7, 0xFED8], // ق
  0x0643: [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], // ك
  0x0644: [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0], // ل
  0x0645: [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4], // م
  0x0646: [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8], // ن
  0x0647: [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC], // ه
  0x0648: [0xFEED, 0xFEEE, 0xFEED, 0xFEEE], // و
  0x0649: [0xFEEF, 0xFEF0, 0xFEEF, 0xFEF0], // ى
  0x064A: [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], // ي
};

// Characters that do NOT connect to the next letter
const RIGHT_JOIN_ONLY = new Set([
  0x0627, 0x0622, 0x0623, 0x0625, 0x062F, 0x0630,
  0x0631, 0x0632, 0x0648, 0x0624, 0x0629, 0x0649,
]);

// Tashkeel / diacritics — pass through without affecting joining
const TASHKEEL = new Set([
  0x064B, 0x064C, 0x064D, 0x064E, 0x064F, 0x0650,
  0x0651, 0x0652, 0x0670,
]);

function isArabicLetter(cp: number): boolean {
  return cp >= 0x0621 && cp <= 0x064A && !TASHKEEL.has(cp);
}

export function reshapeArabic(text: string): string {
  const codePoints = [...text].map((c) => c.codePointAt(0)!);
  const result: number[] = [];

  for (let i = 0; i < codePoints.length; i++) {
    const cp = codePoints[i];

    if (TASHKEEL.has(cp)) {
      result.push(cp);
      continue;
    }

    if (!isArabicLetter(cp) || !ARABIC_FORMS[cp]) {
      result.push(cp);
      continue;
    }

    // Determine joining context (skip tashkeel when looking for neighbours)
    let prevIdx = i - 1;
    while (prevIdx >= 0 && TASHKEEL.has(codePoints[prevIdx])) prevIdx--;
    let nextIdx = i + 1;
    while (nextIdx < codePoints.length && TASHKEEL.has(codePoints[nextIdx])) nextIdx++;

    const prevCP = prevIdx >= 0 ? codePoints[prevIdx] : 0;
    const nextCP = nextIdx < codePoints.length ? codePoints[nextIdx] : 0;

    const prevJoins = isArabicLetter(prevCP) && ARABIC_FORMS[prevCP] && !RIGHT_JOIN_ONLY.has(prevCP);
    const nextJoins = isArabicLetter(nextCP) && ARABIC_FORMS[nextCP] !== undefined;

    // Lam-Alef ligatures
    if (cp === 0x0644 && nextJoins) {
      const ncp = nextCP;
      if (ncp === 0x0627) { result.push(prevJoins ? 0xFEFC : 0xFEFB); i = nextIdx; continue; }
      if (ncp === 0x0622) { result.push(prevJoins ? 0xFEF6 : 0xFEF5); i = nextIdx; continue; }
      if (ncp === 0x0623) { result.push(prevJoins ? 0xFEF8 : 0xFEF7); i = nextIdx; continue; }
      if (ncp === 0x0625) { result.push(prevJoins ? 0xFEFA : 0xFEF9); i = nextIdx; continue; }
    }

    const forms = ARABIC_FORMS[cp];
    let form: number;
    if (prevJoins && nextJoins) form = forms[3]; // medial
    else if (prevJoins) form = forms[1]; // final
    else if (nextJoins) form = forms[2]; // initial
    else form = forms[0]; // isolated

    result.push(form);
  }

  return String.fromCodePoint(...result);
}

/** Reverse only for visual RTL rendering. Numbers/Latin kept LTR within runs. */
export function visualRTL(text: string): string {
  const runs: { text: string; isArabic: boolean }[] = [];
  let current = "";
  let currentIsArabic = false;

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const arabic =
      (cp >= 0x0600 && cp <= 0x06FF) ||
      (cp >= 0xFB50 && cp <= 0xFDFF) ||
      (cp >= 0xFE70 && cp <= 0xFEFF);

    if (current.length === 0) {
      currentIsArabic = arabic;
      current = ch;
    } else if (arabic === currentIsArabic || ch === " ") {
      current += ch;
    } else {
      runs.push({ text: current, isArabic: currentIsArabic });
      current = ch;
      currentIsArabic = arabic;
    }
  }
  if (current) runs.push({ text: current, isArabic: currentIsArabic });

  runs.reverse();
  return runs
    .map((r) =>
      r.isArabic ? [...r.text].reverse().join("") : r.text
    )
    .join("");
}

/** معالجة نص عربي كاملة: تشكيل + عكس RTL */
export function processArabicText(text: string): string {
  return visualRTL(reshapeArabic(text));
}
