# Upgrade packages, keeping TypeScript and Vite where they are

TypeScript stays at 5.8.3 and Vite stays at 5, as you chose (saved rule plus platform support). Everything else that has a newer major version gets upgraded, one group at a time. Each group is checked before moving on, and a group that breaks gets rolled back and reported.

## Groups, in order
1. **Testing tools:** vitest 5, @vitest/coverage-v8 5, jsdom 30, @testing-library/jest-dom 7.
2. **Code-style checking:** eslint 10, @eslint/js 10 (adjust the config if the new version needs it).
3. **Runtime libraries used by pages:** @sentry/react 11, @simplewebauthn/browser 14 (biometric sign-in), web-vitals 6.
4. **Build helpers that work with Vite 5:** @vitejs/plugin-react-swc 4, vite-plugin-pwa 2, rollup-plugin-visualizer 7. Any of these that require a newer Vite stay where they are, and I'll say so.
5. **Other:** @types/node 26, postgres 4, @lovable.dev/mcp-js 3.

## Checks after each group (regression guard)
- Code-error check is clean, and the preview build log shows "build OK".
- The full test suite passes (currently 2,330 tests), including the package security guard.
- Package security scan shows 0 vulnerabilities.
- After group 3 and at the end: open the main pages in a browser (home, sign-in, admin dashboard, beneficiary screens, support, messages) and confirm no page errors.
- Deliberate break: after each fix, undo it once, confirm a check catches it, then restore it.

## Technical details
- Use `bun add <pkg>@latest`, separated into dev and runtime dependencies. bun.lock stays the only lockfile.
- For WebAuthn 14, Sentry 11, and web-vitals 6, review breaking API changes and adjust the call sites, keeping behavior the same.
- When a package needs a newer Vite or TypeScript, keep it on its latest compatible major version.
