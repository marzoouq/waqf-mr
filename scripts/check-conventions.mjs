#!/usr/bin/env node
/**
 * check-conventions.mjs — حارس قواعد المعمارية للمشروع
 *
 * يفشل عند مخالفات Critical/High:
 *   1. console.* خارج src/lib/logger.ts
 *   2. supabase داخل src/pages/ أو src/components/
 *   3. supabase.from(...) داخل src/lib/ خارج services/ و auth/
 *   4. localStorage لمفتاح fiscal_year
 *   5. sonner / supabase داخل src/utils/
 *   6. ملفات > 250 سطر في components/pages/hooks
 *   7. تبعية عكسية: hooks/data أو hooks/domain يستورد من hooks/page
 *   8. components/pages يستورد @/lib/services مباشرة (يجب الالتفاف بهوك)
 *   9. supabase.functions.invoke خارج src/lib/api/invoke.ts
 *  10. supabase.rpc خارج src/lib/api/rpc.ts و errorReporter.ts
 *
 * تحذيرات (لا تفشل):
 *   - ملفات hooks/page > 200 سطر — مرشّحة للتفكيك
 *   - barrel فيه > 25 export — مرشّح للتقسيم
 *   - single-table service بمستهلك <3 ولا يحوي storage/invoke/rpc — مرشّح للدمج
 *
 * شغّل عبر: npm run lint:conventions
 * تجاوز التحذيرات بفشل: LINT_STRICT=1 npm run lint:conventions
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const STRICT = process.env.LINT_STRICT === '1';
const violations = [];
const warnings = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(p))) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const SUPABASE_CLIENT_IMPORT = /from ['"]@\/integrations\/supabase\/client['"]/;
const SUPABASE_CALL = /\bsupabase\.(from|rpc|auth|functions|storage|channel)\b/;

for (const file of files) {
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const isTest = /\.test\.tsx?$/.test(rel);

  // 1) console.*
  if (!rel.endsWith('src/lib/logger.ts') && !isTest) {
    lines.forEach((line, i) => {
      if (/^\s*console\.(log|warn|error|info|debug)\(/.test(line) && !line.includes('eslint-disable')) {
        violations.push(`${rel}:${i + 1} — console.* محظور (استخدم logger من @/lib/logger)`);
      }
    });
  }

  // 2) supabase داخل pages/ أو components/
  if ((rel.startsWith('src/pages/') || rel.startsWith('src/components/')) && !isTest) {
    lines.forEach((line, i) => {
      if (SUPABASE_CLIENT_IMPORT.test(line)) {
        const where = rel.startsWith('src/pages/') ? 'pages/' : 'components/';
        violations.push(`${rel}:${i + 1} — استيراد supabase من ${where} محظور (استخدم hooks/data)`);
      }
    });
  }

  // 3) supabase.* خارج boundaries المسموحة في lib/
  // المسموح: services/ (domain), auth/ (مصادقة), api/ (RPC/invoke wrappers),
  // realtime/ (channel factory), errorReporter.ts (تسجيل أخطاء)
  const LIB_SUPABASE_ALLOWED = [
    'src/lib/services/',
    'src/lib/auth/',
    'src/lib/api/',
    'src/lib/realtime/',
  ];
  const LIB_SUPABASE_ALLOWED_FILES = ['src/lib/errorReporter.ts'];
  if (rel.startsWith('src/lib/') && !isTest) {
    const isAllowed =
      LIB_SUPABASE_ALLOWED.some((p) => rel.startsWith(p)) ||
      LIB_SUPABASE_ALLOWED_FILES.includes(rel);
    if (!isAllowed) {
      lines.forEach((line, i) => {
        if (SUPABASE_CALL.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          violations.push(`${rel}:${i + 1} — supabase.* محظور في lib/ خارج boundaries (services/auth/api/realtime). انقل إلى service.`);
        }
      });
    }
  }

  // 4) localStorage مع fiscal_year
  lines.forEach((line, i) => {
    if (/localStorage[^.]*fiscal_year/.test(line) && !line.trim().startsWith('//')) {
      violations.push(`${rel}:${i + 1} — استخدم sessionStorage لـ fiscal_year_id`);
    }
  });

  // 5) sonner / supabase في utils/
  if (rel.startsWith('src/utils/') && !isTest) {
    lines.forEach((line, i) => {
      if (/from ['"]sonner['"]/.test(line)) {
        violations.push(`${rel}:${i + 1} — sonner محظور في utils/ (استخدم lib/notify)`);
      }
      if (SUPABASE_CLIENT_IMPORT.test(line)) {
        violations.push(`${rel}:${i + 1} — supabase محظور في utils/ (استخدم lib/services)`);
      }
    });
  }

  // 6) حجم الملف
  if (!isTest && (rel.startsWith('src/components/') || rel.startsWith('src/pages/') || rel.startsWith('src/hooks/'))) {
    if (lines.length > 250) {
      violations.push(`${rel} — ${lines.length} سطر (الحد 250). قسّم الملف.`);
    } else if (rel.startsWith('src/hooks/page/') && lines.length > 200) {
      warnings.push(`${rel} — ${lines.length} سطر في hooks/page (الحد المفضّل 200). فكّر بالتقسيم.`);
    }
  }

  // 7) تبعية عكسية: data/domain يستورد من page
  if ((rel.startsWith('src/hooks/data/') || rel.startsWith('src/hooks/domain/')) && !isTest) {
    lines.forEach((line, i) => {
      if (/from ['"]@\/hooks\/page\//.test(line)) {
        violations.push(`${rel}:${i + 1} — تبعية عكسية محظورة (hooks/data|domain ← hooks/page)`);
      }
    });
  }

  // 8) components/ و pages/ لا تستورد من @/lib/services مباشرة
  // (راجع src/lib/services/README.md — يجب المرور عبر hooks/)
  if ((rel.startsWith('src/components/') || rel.startsWith('src/pages/')) && !isTest) {
    lines.forEach((line, i) => {
      if (/from ['"]@\/lib\/services(\/|['"])/.test(line)) {
        const where = rel.startsWith('src/pages/') ? 'pages/' : 'components/';
        violations.push(`${rel}:${i + 1} — استيراد @/lib/services من ${where} محظور (لفّ الاستدعاء بهوك في src/hooks/)`);
      }
    });
  }

  // 9) supabase.functions.invoke فقط داخل lib/api/invoke.ts
  if (rel !== 'src/lib/api/invoke.ts' && !isTest) {
    lines.forEach((line, i) => {
      if (/\bsupabase\.functions\.invoke\s*\(/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        violations.push(`${rel}:${i + 1} — supabase.functions.invoke محظور خارج lib/api/invoke.ts (استخدم invoke() من @/lib/api/invoke)`);
      }
    });
  }

  // 10) supabase.rpc فقط داخل lib/api/rpc.ts و errorReporter.ts (للسبب المعلَّق في الملف)
  const RPC_ALLOWED_FILES = ['src/lib/api/rpc.ts', 'src/lib/errorReporter.ts'];
  if (!RPC_ALLOWED_FILES.includes(rel) && !isTest) {
    lines.forEach((line, i) => {
      if (/\bsupabase\.rpc\s*\(/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        violations.push(`${rel}:${i + 1} — supabase.rpc محظور خارج lib/api/rpc.ts (استخدم rpc() من @/lib/api/rpc)`);
      }
    });
  }

  // 8) barrel كبير
  if (rel.endsWith('/index.ts') && rel.startsWith('src/')) {
    const exports = (text.match(/^export\s+/gm) || []).length;
    if (exports > 25) {
      warnings.push(`${rel} — ${exports} export في barrel واحد. فكّر بالتقسيم.`);
    }
  }
}

if (warnings.length > 0) {
  console.log(`\n⚠ ${warnings.length} تحذير:\n`);
  for (const w of warnings) console.log(`  ${w}`);
}

if (violations.length > 0) {
  console.error(`\n✖ ${violations.length} مخالفة معمارية:\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error('\nراجع ARCHITECTURE.md و mem://conventions/code-style-and-naming\n');
  process.exit(1);
}

if (STRICT && warnings.length > 0) {
  console.error(`\n✖ STRICT mode: ${warnings.length} تحذير = فشل\n`);
  process.exit(1);
}

console.log(`\n✔ لا مخالفات معمارية (${files.length} ملف، ${warnings.length} تحذير)`);
