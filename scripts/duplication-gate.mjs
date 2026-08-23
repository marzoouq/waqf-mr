#!/usr/bin/env node
/**
 * بوابة عدم التكرار (Anti-Duplication Gate)
 * ------------------------------------------
 * يشغّل jscpd على src/ ويرفض التنفيذ (exit 1) إذا:
 *  - تجاوزت نسبة الأسطر المكرّرة الحد المسموح (DUP_MAX_PERCENT، الافتراضي 0.40%)، أو
 *  - وُجد أي استنساخ (clone) بطول ≥ DUP_MAX_CLONE_LINES (الافتراضي 25 سطراً).
 *
 * الاستخدام: npm run quality:dup
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "audit", "duplication");
const REPORT = join(OUT_DIR, "jscpd-report.json");
const MAX_PERCENT = Number.parseFloat(process.env.DUP_MAX_PERCENT ?? "0.40");
const MAX_CLONE_LINES = Number.parseInt(process.env.DUP_MAX_CLONE_LINES ?? "25", 10);

mkdirSync(OUT_DIR, { recursive: true });

try {
  execFileSync("npx", ["--yes", "jscpd", "src", "--silent"], { stdio: "inherit", cwd: ROOT });
} catch {
  // jscpd يخرج بغير صفر عند تجاوز threshold — نعتمد على التقرير للتفصيل
}

if (!existsSync(REPORT)) {
  console.error("❌ تعذّر إنتاج تقرير التكرار (jscpd-report.json مفقود).");
  process.exit(2);
}

const report = JSON.parse(readFileSync(REPORT, "utf8"));
const percent = Number(report.statistics?.total?.percentage ?? 0);
const clones = report.duplicates ?? [];
const bigClones = clones
  .filter((c) => Number(c.lines) >= MAX_CLONE_LINES)
  .sort((a, b) => b.lines - a.lines);

console.log("\n=== بوابة عدم التكرار ===");
console.log(`نسبة الأسطر المكرّرة: ${percent}% (الحد: ${MAX_PERCENT}%)`);
console.log(`عدد الاستنساخات: ${clones.length} — منها ${bigClones.length} بطول ≥ ${MAX_CLONE_LINES} سطراً`);

for (const c of bigClones) {
  console.log(
    `  • ${c.lines} سطراً: ${c.firstFile.name}:${c.firstFile.start} <-> ${c.secondFile.name}:${c.secondFile.start}`,
  );
}

const failures = [];
if (percent > MAX_PERCENT) failures.push(`النسبة ${percent}% تتجاوز الحد ${MAX_PERCENT}%`);
if (bigClones.length > 0) failures.push(`${bigClones.length} استنساخ كبير يجب استخراجه إلى وحدة مشتركة`);

if (failures.length > 0) {
  console.error("\n❌ فشل: يجب إصلاح التكرار قبل الدمج");
  for (const f of failures) console.error(`   - ${f}`);
  console.error("   القاعدة: أي منطق/تخطيط يتكرر يُستخرج إلى hook مشترك أو مكوّن أو وحدة أنواع.");
  process.exit(1);
}

console.log("\n✅ نجاح: لا تكرار يتجاوز الحدود المعتمدة.");
process.exit(0);
