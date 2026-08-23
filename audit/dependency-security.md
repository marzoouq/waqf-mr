## 🔒 بوابة أمان التبعيات

| المستوى | العدد |
|---|---|
| Critical | 0 |
| High | 2 |
| Moderate | 0 |
| Low | 1 |

| الحزمة | الخطورة | النطاق | نوع | إصلاح متاح | الثغرة |
|---|---|---|---|---|---|
| `react-router` | high | <7.18.2 | prod | ✅ | RSC Mode CSRF Bypass |
| `esbuild` | high | <0.25 | prod | ✅ | dev server SSRF |

❌ **الدمج مرفوض:** 2 ثغرة حاجزة (high/critical).

### التقارير الأمنية المرتبطة

- `docs/security/weekly-audit.md`
- `docs/security/views.md`
- `docs/security/security-definer-allowlist.md`
- `docs/security/incident-2026-07-08-env-leak.md`
- `docs/security/csp-policy.md`

التقرير الكامل: artifact `dependency-security-report` (`audit/dependency-security.json`).
