# Structure Inventory Summary

## Files per layer

| Layer | Count | Total LOC | Avg LOC |
|---|---:|---:|---:|
| component | 470 | 37685 | 80 |
| util | 149 | 12304 | 83 |
| hook-data | 129 | 8163 | 63 |
| lib | 118 | 9140 | 77 |
| hook-page | 113 | 11266 | 100 |
| page | 69 | 7825 | 113 |
| test | 58 | 4991 | 86 |
| constant | 29 | 1701 | 59 |
| hook-auth | 24 | 2082 | 87 |
| type | 24 | 1004 | 42 |
| hook-domain | 21 | 2745 | 131 |
| hook-ui | 19 | 964 | 51 |
| hook-application | 16 | 1111 | 69 |
| app | 8 | 205 | 26 |
| route | 8 | 258 | 32 |
| context | 5 | 238 | 48 |
| other | 3 | 66 | 22 |
| integration | 3 | 2644 | 881 |

## Files > 200 LOC (18)

| File | Layer | LOC |
|---|---|---:|
| integrations/supabase/types.ts | integration | 2610 |
| hooks/domain/financial/useComputedFinancials.test.ts | hook-domain | 683 |
| utils/financial/fiscalYearClosure.test.ts | util | 408 |
| hooks/auth/biometric/useWebAuthn.test.ts | hook-auth | 405 |
| utils/financial/accountsCalculations.test.ts | util | 378 |
| utils/financial/zatcaSharedLogic.test.ts | util | 361 |
| test/permissionsResilience.test.tsx | test | 343 |
| lib/diagnostics/checks.test.ts | lib | 290 |
| utils/pdf/reports/aggregatedAnnualReport.ts | util | 275 |
| hooks/domain/financial/financialIntegration.test.ts | hook-domain | 262 |
| utils/pdf/entities/accounts.test.ts | util | 248 |
| components/ui/native-select-dialog.integration.test.tsx | component | 240 |
| test/incomeExpensesCrudReflection.test.tsx | test | 238 |
| test/authFlowsIntegration.test.tsx | test | 237 |
| test/edgeFunctionAuth.test.ts | test | 237 |
| lib/diagnostics/checks.ts | lib | 224 |
| lib/services/diagnosticsReadService.ts | lib | 220 |
| hooks/data/support/useSupportTickets.test.ts | hook-data | 201 |