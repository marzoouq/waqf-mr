# Structure Inventory Summary

## Files per layer

| Layer | Count | Total LOC | Avg LOC |
|---|---:|---:|---:|
| component | 494 | 39650 | 80 |
| util | 154 | 12440 | 81 |
| lib | 143 | 10094 | 71 |
| hook-data | 139 | 8924 | 64 |
| hook-page | 126 | 12066 | 96 |
| page | 72 | 8091 | 112 |
| test | 59 | 5060 | 86 |
| constant | 29 | 1760 | 61 |
| type | 27 | 1136 | 42 |
| hook-auth | 25 | 2163 | 87 |
| hook-ui | 22 | 1320 | 60 |
| hook-domain | 21 | 2781 | 132 |
| hook-application | 16 | 1129 | 71 |
| app | 8 | 220 | 28 |
| route | 8 | 263 | 33 |
| context | 5 | 238 | 48 |
| other | 3 | 66 | 22 |
| integration | 3 | 2715 | 905 |

## Files > 200 LOC (18)

| File | Layer | LOC |
|---|---|---:|
| integrations/supabase/types.ts | integration | 2681 |
| hooks/domain/financial/useComputedFinancials.test.ts | hook-domain | 683 |
| utils/financial/fiscalYear/fiscalYearClosure.test.ts | util | 408 |
| hooks/auth/biometric/useWebAuthn.test.ts | hook-auth | 405 |
| utils/financial/fiscalYear/accountsCalculations.test.ts | util | 378 |
| utils/financial/zatca/zatcaSharedLogic.test.ts | util | 361 |
| test/permissionsResilience.test.tsx | test | 346 |
| lib/diagnostics/checks.test.ts | lib | 291 |
| hooks/domain/financial/financialIntegration.test.ts | hook-domain | 262 |
| utils/pdf/entities/accounts.test.ts | util | 248 |
| components/ui/native-select-dialog.integration.test.tsx | component | 240 |
| test/incomeExpensesCrudReflection.test.tsx | test | 238 |
| test/authFlowsIntegration.test.tsx | test | 237 |
| test/edgeFunctionAuth.test.ts | test | 237 |
| lib/services/diagnosticsReadService.ts | lib | 223 |
| constants/navigation.ts | constant | 220 |
| utils/financial/distribution/distributionCalcPure.test.ts | util | 212 |
| hooks/data/support/useSupportTickets.test.ts | hook-data | 201 |