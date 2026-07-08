#!/usr/bin/env node
/**
 * count-edge-functions.mjs
 *
 * يقرأ عدد وأسماء Edge Functions الفعلية من supabase/functions/
 * (يستثني المجلدات المخفية و _shared والملفات).
 *
 * الأوضاع:
 *   بدون علم       → طباعة العدد + القائمة.
 *   --check       → مقارنة الأرقام في README.md و SECURITY.md مع الفعلي؛ exit 1 عند الانحراف.
 *   --write       → تحديث markers في README.md و SECURITY.md تلقائياً.
 *
 * Markers المستخدمة:
 *   <!-- edge-functions:count -->NN<!-- /edge-functions:count -->
 *   <!-- edge-functions:list -->name1, name2, ...<!-- /edge-functions:list -->
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUNCS_DIR = join(ROOT, 'supabase', 'functions');
const README = join(ROOT, 'README.md');
const SECURITY = join(ROOT, 'SECURITY.md');

function listFunctions() {
  return readdirSync(FUNCS_DIR)
    .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
    .filter((name) => {
      try {
        return statSync(join(FUNCS_DIR, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}

const COUNT_RE = /<!--\s*edge-functions:count\s*-->[\s\S]*?<!--\s*\/edge-functions:count\s*-->/g;
const LIST_RE = /<!--\s*edge-functions:list\s*-->[\s\S]*?<!--\s*\/edge-functions:list\s*-->/g;

function replaceMarkers(content, count, list) {
  return content
    .replace(COUNT_RE, `<!-- edge-functions:count -->${count}<!-- /edge-functions:count -->`)
    .replace(LIST_RE, `<!-- edge-functions:list -->${list.join(', ')}<!-- /edge-functions:list -->`);
}

function hasMarker(content) {
  return COUNT_RE.test(content);
}

const mode = process.argv[2];
const funcs = listFunctions();
const count = funcs.length;

if (mode === '--write') {
  for (const file of [README, SECURITY]) {
    const content = readFileSync(file, 'utf8');
    if (!hasMarker(content)) {
      console.warn(`⚠️  ${file}: لا يحوي marker edge-functions:count — تخطّي`);
      continue;
    }
    writeFileSync(file, replaceMarkers(content, count, funcs));
    console.log(`✅ ${file} محدَّث → ${count} function`);
  }
  process.exit(0);
}

if (mode === '--check') {
  let ok = true;
  for (const file of [README, SECURITY]) {
    const content = readFileSync(file, 'utf8');
    const match = content.match(/<!--\s*edge-functions:count\s*-->(\d+)<!--\s*\/edge-functions:count\s*-->/);
    if (!match) {
      console.error(`❌ ${file}: marker edge-functions:count مفقود`);
      ok = false;
      continue;
    }
    const docCount = Number(match[1]);
    if (docCount !== count) {
      console.error(`❌ ${file}: العدد ${docCount} ≠ الفعلي ${count}`);
      ok = false;
    } else {
      console.log(`✅ ${file}: ${docCount} = ${count}`);
    }
  }
  process.exit(ok ? 0 : 1);
}

// افتراضي: طباعة
console.log(`Edge Functions: ${count}`);
console.log(funcs.map((n) => `  - ${n}`).join('\n'));
