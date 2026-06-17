# R6 — تشديد تكاملات Edge (ZATCA + AI + lookup) — مُنفَّذ 2026-06-17

## ✅ تم بالكامل (9 إصلاحات حرجة/عالية)

### A. ZATCA OTP — إزالة fallback يتجاوز vault
| # | الملف | التعديل |
|---|------|---------|
| W5-#24 | `supabase/functions/zatca-onboard/index.ts:75-83` | حذف `Deno.env.get("ZATCA_OTP")` fallback؛ OTP حصراً عبر RPC الخزنة `consume_zatca_otp`. fail-closed عند الغياب. |
| W5-#25 | `supabase/functions/zatca-renew/index.ts:39-47` | نفس الفصل. لا يتجاوز التشفير ولا single-use. |

### B. AI Gateway timeout — منع تجمّد Deno worker
| # | الملف | التعديل |
|---|------|---------|
| W5-#10 | `supabase/functions/ai-assistant/index.ts:125-153` | `AbortController` + `setTimeout(30_000)` على fetch streaming. عند abort → 504 برسالة عربية واضحة. `clearTimeout` بعد headers ready (البث نفسه يكمل). |

### C. تسريب PII في console.error
| # | الملف | التعديل |
|---|------|---------|
| W5-#6 | `lookup-national-id/index.ts:201-208` | إزالة `(dbErr).message` من `console.error` — كانت قد تحتوي قيمة `national_id` المُمرَّرة لـ RPC. |
| W5-#7 | `lookup-national-id/index.ts:303-306` | إزالة `(authErr).message` — كانت قد تحوي fragments من email/password. |

### D. تسريب fetchErr.message في ZATCA لردود العميل
| # | الملف | التعديل |
|---|------|---------|
| W5-#18 | `zatca-onboard/index.ts:60-66, 151-157, 183-187` | تفاصيل الخطأ تُسجَّل في `zatca_operation_log` للمدير فقط؛ العميل يستقبل `"ZATCA API unreachable"` ثابتة. |
| W5-#19 | `zatca-renew/index.ts:134-140` | نفس النمط. |
| W5-#20 | `zatca-report/index.ts:82-87, 114-118, 159-164` | ثلاثة مواقع — نفس النمط. |

### E. timeout على lookup auth REST
| # | الملف | التعديل |
|---|------|---------|
| W5-#11 | `lookup-national-id/index.ts:252-267` | `AbortController` 5s على `${supabaseUrl}/auth/v1/token`. عند abort → "خطأ مؤقت في المصادقة". |

## ⏸️ مؤجَّل
- **W5-#3, #5, #15** Zod/rate-limit على `check-contract-expiry` و`guard-signup` strict → R7.
- **W5-#12** timeout على `sendLovableEmail` → R7.
- **W5-#22, #23** تنظيف `config.toml` verify_jwt → R9.
- **W5-#26, #27** فصل LOVABLE keys → R10.

## تحقق ما بعد النشر
- `supabase--deploy_edge_functions` نجح للوظائف الخمس.
- لا تغيير في contract الـ API الظاهر للعميل: نفس HTTP codes، نفس مفاتيح JSON. التغيير الوحيد هو نص رسالة الخطأ (أصبح عاماً ثابتاً).
- ZATCA OTP الآن يفشل صراحةً (status 400 + رسالة عربية) إذا غاب من خزنة DB — لا fallback صامت.

## التالي
**R7** — Auth & WebAuthn (W2): F05/F08/F13/F18/F23 + W1 races + سباقات splash/role.
