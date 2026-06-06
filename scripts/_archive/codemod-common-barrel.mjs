#!/usr/bin/env node
/**
 * Codemod — rewrite all `@/components/common/<subpath>` imports to barrel `@/components/common`.
 * Skips files inside src/components/common/** (they must use relative imports).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const SKIP = path.join('src', 'components', 'common');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const RE = /^import\s+(?:(\w+)|\{([^}]+)\}|(\w+)\s*,\s*\{([^}]+)\})\s+from\s+['"]@\/components\/common\/[^'"]+['"];?\s*$/gm;

let totalFiles = 0;
for (const file of walk(ROOT)) {
  if (file.startsWith(SKIP + path.sep)) continue;
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('@/components/common/')) continue;

  const names = new Set();
  const newSrc = src.replace(RE, (_m, def, named, defAlso, namedAlso) => {
    if (def) names.add(def);
    if (defAlso) names.add(defAlso);
    const namedList = named ?? namedAlso;
    if (namedList) {
      for (const raw of namedList.split(',')) {
        const n = raw.trim().replace(/^type\s+/, '');
        if (n) names.add(n);
      }
    }
    return ''; // remove line
  });

  if (names.size === 0) continue;
  // Insert consolidated import at top (after any leading comment/import block — keep simple: prepend)
  const consolidated = `import { ${[...names].sort().join(', ')} } from '@/components/common';\n`;
  // Place it where the first matched import was (approx: after the last existing top-level import block)
  // Simpler: prepend after the first existing import line, or at top if none.
  let final;
  const firstImport = newSrc.match(/^import\s.+;$/m);
  if (firstImport) {
    const idx = newSrc.indexOf(firstImport[0]);
    final = newSrc.slice(0, idx) + consolidated + newSrc.slice(idx);
  } else {
    final = consolidated + newSrc;
  }
  // Clean up resulting consecutive blank lines
  final = final.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(file, final);
  totalFiles++;
  console.log(`✓ ${file} (${[...names].join(', ')})`);
}
console.log(`\nRewrote ${totalFiles} files.`);
