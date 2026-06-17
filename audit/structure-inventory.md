# Structure Inventory Summary

## Files per layer

| Layer | Count | Total LOC | Avg LOC |
|---|---:|---:|---:|
| component | 470 | 37688 | 80 |
| util | 149 | 12304 | 83 |
| lib | 133 | 9606 | 72 |
| hook-data | 129 | 8237 | 64 |
| hook-page | 116 | 11347 | 98 |
| page | 69 | 7825 | 113 |
| test | 58 | 4999 | 86 |
| constant | 29 | 1701 | 59 |
| type | 25 | 1031 | 41 |
| hook-auth | 24 | 2087 | 87 |
| hook-domain | 21 | 2745 | 131 |
| hook-ui | 19 | 964 | 51 |
| hook-application | 16 | 1111 | 69 |
| app | 8 | 205 | 26 |
| route | 8 | 258 | 32 |
| context | 5 | 238 | 48 |
| other | 3 | 66 | 22 |
| integration | 3 | 2653 | 884 |

## Files > 200 LOC (18)

| File | Layer | LOC |
|---|---|---:|
| integrations/supabase/types.ts | integration | 2619 |
| hooks/domain/financial/useComputedFinancials.test.ts | hook-domain | 683 |
| utils/financial/fiscalYear/fiscalYearClosure.test.ts | util | 408 |
| hooks/auth/biometric/useWebAuthn.test.ts | hook-auth | 405 |
| utils/financial/fiscalYear/accountsCalculations.test.ts | util | 378 |
| utils/financial/zatca/zatcaSharedLogic.test.ts | util | 361 |
| test/permissionsResilience.test.tsx | test | 343 |
| lib/diagnostics/checks.test.ts | lib | 291 |
| utils/pdf/reports/aggregatedAnnualReport.ts | util | 275 |
| hooks/domain/financial/financialIntegration.test.ts | hook-domain | 262 |
| utils/pdf/entities/accounts.test.ts | util | 248 |
| components/ui/native-select-dialog.integration.test.tsx | component | 240 |
| test/incomeExpensesCrudReflection.test.tsx | test | 238 |
| test/authFlowsIntegration.test.tsx | test | 237 |
| test/edgeFunctionAuth.test.ts | test | 237 |
| lib/diagnostics/checks.ts | lib | 224 |
| lib/services/diagnosticsReadService.ts | lib | 223 |
| hooks/data/support/useSupportTickets.test.ts | hook-data | 201 |