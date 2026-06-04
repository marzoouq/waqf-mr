#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * build-permissions-matrix — Round W
 *
 * Generates audit/ui-permissions-matrix.csv with EXACTLY 156 data rows + 1 header row
 * (39 routes × 4 roles), built from:
 *   - src/constants/routeRoles.ts       (ROUTE_ROLES)
 *   - src/constants/routeRegistry.ts    (ALL_ROUTES → permKey/sectionKey)
 *   - src/constants/rolePermissions.ts  (DEFAULT_ROLE_PERMS)
 *
 * Columns:
 *   route, role, role_allowed, perm_key, section_key,
 *   effective_allowed, access_basis, status
 *
 * access_basis ∈ admin-override | role-only | role+permission | role+section |
 *                role+permission+section | uncontrolled | denied-role |
 *                denied-permission | denied-section
 *
 * This is the SINGLE SOURCE OF TRUTH for the role/route matrix and is consumed
 * by src/test/uiPermissionsMatrix.test.ts.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();

/** Extract `Record<string, …>` keys from a TS source by literal `'/path':` matches. */
function extractObjectKeys(tsSource, exportName) {
  const start = tsSource.indexOf(`export const ${exportName}`);
  if (start === -1) throw new Error(`Cannot find export ${exportName}`);
  // grab everything until matching `} as const` or `};`
  const tail = tsSource.slice(start);
  const closeIdx = tail.search(/\n\}\s*(as\s+const)?\s*;/);
  const body = tail.slice(0, closeIdx === -1 ? 5000 : closeIdx);
  const re = /^\s*'([^']+)'\s*:/gm;
  const out = [];
  let m;
  while ((m = re.exec(body)) !== null) out.push(m[1]);
  return out;
}

/** Parse simple `'/x': [...]` pairs from ROUTE_ROLES. */
function parseRouteRoles(src) {
  const map = {};
  const re = /^\s*'([^']+)'\s*:\s*\[([^\]]+)\]/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const route = m[1];
    const roles = m[2].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    map[route] = roles;
  }
  return map;
}

/** Parse meta from ALL_ROUTES / ADMIN_ROUTES / BENEFICIARY_ROUTES. */
function parseRouteMeta(src) {
  // pattern: '/path': { ... permKey: 'x' ... sectionKey: 'y' ... }
  const re = /^\s*'([^']+)'\s*:\s*\{([^}]*)\}/gm;
  const out = {};
  let m;
  while ((m = re.exec(src)) !== null) {
    const route = m[1];
    const body = m[2];
    const pk = /permKey\s*:\s*'([^']+)'/.exec(body);
    const sk = /sectionKey\s*:\s*'([^']+)'/.exec(body);
    out[route] = { permKey: pk?.[1], sectionKey: sk?.[1] };
  }
  return out;
}

/** Parse DEFAULT_ROLE_PERMS = { role: { key: true|false } }. */
function parseRolePerms(src) {
  const start = src.indexOf('DEFAULT_ROLE_PERMS');
  const body = src.slice(start);
  const out = {};
  const roleRe = /(\w+)\s*:\s*\{([^}]+)\}/g;
  let m;
  while ((m = roleRe.exec(body)) !== null) {
    const role = m[1];
    if (!['accountant', 'beneficiary', 'waqif', 'admin'].includes(role)) continue;
    const inner = m[2];
    const perms = {};
    const kvRe = /(\w+)\s*:\s*(true|false)/g;
    let k;
    while ((k = kvRe.exec(inner)) !== null) perms[k[1]] = k[2] === 'true';
    out[role] = perms;
  }
  return out;
}

function evaluate(role, route, routeRoles, routeMeta, rolePerms) {
  if (role === 'admin') return { role_allowed: true, effective_allowed: true, basis: 'admin-override' };
  const reachable = routeRoles[route] || [];
  const role_allowed = reachable.includes(role);
  if (!role_allowed) return { role_allowed: false, effective_allowed: false, basis: 'denied-role' };
  const meta = routeMeta[route] || {};
  const pk = meta.permKey;
  const sk = meta.sectionKey;
  if (pk && rolePerms[role]?.[pk] === false) {
    return { role_allowed: true, effective_allowed: false, basis: 'denied-permission' };
  }
  if (!pk && !sk) return { role_allowed: true, effective_allowed: true, basis: 'uncontrolled' };
  if (pk && sk) return { role_allowed: true, effective_allowed: true, basis: 'role+permission+section' };
  if (pk) return { role_allowed: true, effective_allowed: true, basis: 'role+permission' };
  return { role_allowed: true, effective_allowed: true, basis: 'role+section' };
}

function main() {
  const routeRolesSrc = readFileSync(resolve(ROOT, 'src/constants/routeRoles.ts'), 'utf8');
  const registrySrc = readFileSync(resolve(ROOT, 'src/constants/routeRegistry.ts'), 'utf8');
  const permsSrc = readFileSync(resolve(ROOT, 'src/constants/rolePermissions.ts'), 'utf8');

  const routeRoles = parseRouteRoles(routeRolesSrc);
  const routeMeta = parseRouteMeta(registrySrc);
  const rolePerms = parseRolePerms(permsSrc);

  const roles = ['admin', 'accountant', 'beneficiary', 'waqif'];
  const routes = Object.keys(routeRoles).sort();

  if (routes.length !== 39) {
    console.error(`Expected 39 routes, got ${routes.length}`);
    process.exit(1);
  }

  const header = 'route,role,role_allowed,perm_key,section_key,effective_allowed,access_basis,status';
  const rows = [];
  for (const route of routes) {
    const meta = routeMeta[route] || {};
    for (const role of roles) {
      const r = evaluate(role, route, routeRoles, routeMeta, rolePerms);
      const status = r.effective_allowed ? 'ALLOWED' : 'DENIED';
      rows.push([
        route,
        role,
        r.role_allowed,
        meta.permKey ?? '',
        meta.sectionKey ?? '',
        r.effective_allowed,
        r.basis,
        status,
      ].join(','));
    }
  }

  if (rows.length !== 156) {
    console.error(`Expected 156 data rows, got ${rows.length}`);
    process.exit(1);
  }

  const outDir = resolve(ROOT, 'audit');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'ui-permissions-matrix.csv'), [header, ...rows].join('\n') + '\n', 'utf8');
  console.log(`Wrote audit/ui-permissions-matrix.csv (${rows.length} data rows + 1 header)`);
}

main();
