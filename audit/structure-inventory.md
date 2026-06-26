# Structure Inventory Summary

## Files per layer

| Layer | Count | Total LOC | Avg LOC |
|---|---:|---:|---:|
| component | 480 | 38355 | 80 |
| util | 152 | 12393 | 82 |
| lib | 136 | 9698 | 71 |
| hook-data | 133 | 8581 | 65 |
| hook-page | 122 | 11874 | 97 |
| page | 71 | 8021 | 113 |
| test | 58 | 5010 | 86 |
| constant | 29 | 1752 | 60 |
| type | 27 | 1120 | 41 |
| hook-auth | 25 | 2161 | 86 |
| hook-domain | 21 | 2781 | 132 |
| hook-ui | 20 | 1148 | 57 |
| hook-application | 16 | 1129 | 71 |
| app | 8 | 218 | 27 |
| route | 8 | 261 | 33 |
| context | 5 | 238 | 48 |
| other | 3 | 66 | 22 |
| integration | 3 | 2699 | 900 |

## Files > 200 LOC (18)

| File | Layer | LOC |
|---|---|---:|
| integrations/supabase/types.ts | integration | 2665 |
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
| constants/navigation.ts | constant | 219 |
| utils/financial/distribution/distributionCalcPure.test.ts | util | 212 |
| hooks/data/support/useSupportTickets.test.ts | hook-data | 201 |