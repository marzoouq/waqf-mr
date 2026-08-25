# Structure Inventory Summary

## Files per layer

| Layer | Count | Total LOC | Avg LOC |
|---|---:|---:|---:|
| component | 506 | 40785 | 81 |
| util | 154 | 12440 | 81 |
| lib | 149 | 10487 | 70 |
| hook-data | 144 | 9330 | 65 |
| hook-page | 126 | 12013 | 95 |
| page | 78 | 8263 | 106 |
| test | 61 | 5283 | 87 |
| constant | 29 | 1784 | 62 |
| type | 27 | 1136 | 42 |
| hook-auth | 25 | 2163 | 87 |
| hook-ui | 22 | 1320 | 60 |
| hook-domain | 21 | 2764 | 132 |
| hook-application | 18 | 1293 | 72 |
| route | 9 | 311 | 35 |
| app | 8 | 241 | 30 |
| context | 5 | 238 | 48 |
| integration | 4 | 3070 | 768 |
| other | 3 | 66 | 22 |

## Files > 200 LOC (18)

| File | Layer | LOC |
|---|---|---:|
| integrations/supabase/types.ts | integration | 2946 |
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