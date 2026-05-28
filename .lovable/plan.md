# خطة الإصلاحات المعمارية — مُحدّثة بعد التحقق

> **النطاق:** إصلاحات تجميلية آمنة فقط. لا تغييرات DB، لا تغييرات سلوك، لا حذف ميزات.
> **الحالة العامة للمعمارية:** ممتازة (A−). هذه تلميعات نهائية.

## التغييرات في الأرقام بعد التحقق


| البند                            | الأرقام في التقرير | الواقع                               |
| -------------------------------- | ------------------ | ------------------------------------ |
| `useUserManagement.ts` useState  | 9                  | **15**                               |
| `useBylawsPage.ts` useState      | 7                  | **10**                               |
| `FiscalYear` في `src/types/`     | يحتاج إنشاء        | **موجود مسبقاً** في `models.ts:27`   |
| `PaymentInvoice` في `src/types/` | يحتاج إنشاء        | **موجود مسبقاً** في `invoices.ts:34` |


تبسيط مهم: **لا حاجة لإنشاء `src/types/financial.ts**` — فقط إعادة توجيه الاستيرادات.

---

## الخطوات المرتّبة

### 🟡 الخطوة 1 — إعادة توجيه استيرادات الأنواع (10 دقائق، أعلى أولوية)

**الملفات المتأثرة:** 2 ملف، سطر واحد لكل ملف.

1. `**src/utils/financial/collectionCompute.ts:6**`
  - قبل: `import type { FiscalYear } from '@/hooks/data/financial/fiscalYears/useFiscalYears';`
  - بعد: `import type { FiscalYear } from '@/types';`
2. `**src/utils/financial/paymentInvoicesCompute.ts:5**`
  - قبل: `import type { PaymentInvoice } from '@/hooks/data/invoices/usePaymentInvoices';`
  - بعد: `import type { PaymentInvoice } from '@/types/invoices';`

**شرط القبول:** `utils/` لا يستورد شيئاً من `hooks/` (`rg "from ['\"]@/hooks" src/utils/` → فارغ).

**التحقق المطلوب قبل الإصلاح:** التأكد من أن `PaymentInvoice` في `types/invoices.ts` و في `hooks/data/invoices/usePaymentInvoices.ts` متطابقان حقلاً بحقل. إن اختلفا، استخدم نوع الـ hook (لأنه الأقرب لاستعمال utils) ووثّق الفرق.

---

### 🟢 الخطوة 2 — استبدال `as any` في `useVoucherActions.ts` (10 دقائق)

`**src/hooks/page/admin/financial/useVoucherActions.ts:40-41**`

استخدام النوع المُولّد من Supabase بدلاً من `as any`:

```ts
import type { Database } from '@/integrations/supabase/types';
type VoucherPaymentMethod = Database['public']['Enums']['voucher_payment_method'];

// ثم:
p_payment_method: input.payment_method as VoucherPaymentMethod,
```

وحذف تعليق `eslint-disable` المقابل.

**شرط القبول:** عدد `as any` في الإنتاج ينخفض من 3 إلى 2 (المتبقيان موثّقان ومبرّران).

---

### 🟡 الخطوة 3 — تقليل كثافة `useState` (مهمة منفصلة، 1-2 ساعة)

**3.أ — `useUserManagement.ts` (15 → ~5 مجموعات)**

دمج state في 5 كائنات منطقية:

- `dialogState`: `{ isCreateOpen, editingUser, passwordDialog, deleteTarget, pendingConfirmId, showAdvanced }`
- `formState`: `{ createForm, editEmail, editRole, newPassword, showPassword }`
- `filterState`: `{ userSearch, roleFilter, statusFilterUser }`
- `paginationState`: `{ currentPage }` (يبقى مفرداً)

**3.ب — `useBylawsPage.ts` (10 → ~3 مجموعات)**

- `dialogState`: `{ editItem, showAddDialog, deleteItem }`
- `editForm`: `{ editContent, editPartNumber, editPartTitle, editChapterTitle, editChapterNumber }`
- `addForm`: `{ newBylaw }` + `search`

**شرط القبول:** عدد `useState` في كل ملف ≤ 5. السلوك الخارجي للـ hook (return value) لم يتغيّر — تغيير داخلي بحت.

**ملاحظة:** هذه أكبر مخاطرة في الخطة. تتطلب تشغيل الاختبارات بعد التغيير. يمكن تأجيلها لـ PR منفصل.

---

### 🟢 الخطوة 4 — تحديث ملف الذاكرة (5 دقائق)

تحديث `mem://technical/architecture/lib-vs-utils-boundary` بإضافة قاعدة صريحة:

> **types في utils تأتي حصراً من `@/types` — لا من `@/hooks/data/*`.**

---

## ما لن يُنفّذ في هذه الخطة

- ❌ ملفات قرب الحدود (188-197 سطر) — ضمن الحد، لا حاجة للتدخل
- ❌ توحيد 39 `eslint-disable` في وثيقة منفصلة — كلها موثّقة محلياً وذلك أوضح
- ❌ تقسيم `components/accounts/` (33 ملف) — التجميع منطقي حالياً
- ❌ CI check لحجم الملفات — يحتاج قرار منفصل حول tooling

---

## ترتيب التنفيذ الموصى به

**جلسة واحدة قصيرة (~25 دقيقة):** الخطوات 1 + 2 + 4 معاً. مخاطرة دنيا، فوائد فورية.

**جلسة لاحقة منفصلة (~2 ساعة):** الخطوة 3 مع تشغيل suite اختبارات كامل.

## تفاصيل تقنية للتحقق بعد التنفيذ

```bash
# يجب أن تعطي صفر:
rg "from ['\"]@/hooks" src/utils/

# يجب أن تعطي 2 (بدلاً من 3):
rg ":\s*any\b|as any|<any>" -g "*.ts" -g "*.tsx" -g "!**/*.test.*" src/

# يجب أن يكون ≤ 5 لكل ملف:
rg -c "useState\(" src/hooks/auth/role/useUserManagement.ts
rg -c "useState\(" src/hooks/page/admin/management/useBylawsPage.ts
```

عند موافقتك على الخطة سأنتقل إلى وضع البناء وأنفذ الخطوات 1+2+4 أولاً.  
  
ملاحظات تقيد بها عند الاصلاح والتنفيذ   
**Error Fixing**

When fixing errors, focus exclusively on the relevant code sections without modifying unrelated functioning parts. Analyze the error message and trace it to its source. Implement targeted fixes that address the specific issue while maintaining compatibility with the existing codebase. Before confirming any solution, validate that it resolves the original problem without introducing new bugs. Always preserve working functionality and avoid rewriting code that isn’t directly related to the error.

**Code Modification Approach**

When modifying existing code, use a surgical approach that changes only what’s necessary to implement the requested feature or fix. Preserve variable names, coding patterns, and architectural decisions present in the codebase. Before suggesting changes, analyze dependencies to ensure modifications won’t break existing functionality. Present changes as minimal diffs rather than complete rewrites. When improvements beyond the immediate task are identified, suggest them separately without implementing them automatically.

**Database Integration**

Before suggesting new database structures, thoroughly examine the existing schema to identify tables, relationships, and fields already present. Leverage existing tables whenever possible rather than duplicating data models. When modifications to the database are necessary, ensure they’re compatible with existing queries and data access patterns. Consider migration strategies for schema changes that preserve existing data. Always verify foreign key relationships and data integrity constraints before proposing changes.

**Thorough Issue Analysis**

Approach every issue with a comprehensive diagnostic process. Begin by gathering all relevant information through careful examination of error messages, logs, and system behavior. Form multiple hypotheses about potential causes rather than jumping to conclusions. Test each hypothesis methodically until the root cause is identified. Document your analysis process and findings before proposing solutions. Consider potential edge cases and how they might affect the system.

**Solution Verification**

Before confirming any solution, implement a rigorous verification process. Test the solution against the original issue to confirm it resolves the problem. Check for unintended side effects in related functionality. Ensure performance isn’t negatively impacted. Verify compatibility with different environments and configurations. Run through edge cases to ensure robustness. Only after completing this verification should you present the solution as confirmed.

**Code Consistency**

Maintain consistency with the existing codebase in terms of style, patterns, and approaches. Analyze the code to identify naming conventions, formatting preferences, and architectural patterns. Follow these established patterns when implementing new features or fixes. Use the same error handling strategies, logging approaches, and testing methodologies present in the project. This preserves readability and maintainability while reducing the cognitive load for developers.

**Progressive Enhancement**

When adding new features, build upon the existing architecture rather than introducing completely new paradigms. Identify extension points in the current design and leverage them for new functionality. Implement changes that align with the established patterns and principles of the codebase. Focus on backward compatibility to ensure existing features continue to work as expected. Document how new additions integrate with and extend the existing system.

**Documentation and Explanation**

Provide clear, concise explanations for all changes and recommendations. Explain not just what changes are being made, but why they’re necessary and how they work. Document any assumptions or dependencies involved in the solution. Include comments in code when introducing complex logic or non-obvious solutions. When suggesting architectural changes, provide diagrams or high-level explanations that help visualize the impact.

**Technical Debt Awareness**

Recognize when solutions might introduce technical debt and be transparent about these trade-offs. When time constraints necessitate less-than-ideal solutions, clearly identify what aspects would benefit from future refactoring. Distinguish between quick fixes and proper solutions, recommending the appropriate approach based on context. When technical debt is unavoidable, document it clearly to facilitate future improvements.

**Learning and Adaptation**

Continuously adapt to the project’s specific patterns and preferences. Pay attention to feedback on previous suggestions and incorporate these learnings into future recommendations. Build a mental model of the application architecture that becomes increasingly accurate over time. Remember past issues and solutions to avoid repeating mistakes. Actively seek to understand the underlying business requirements driving technical decisions.

**Preventing Duplicate Components**

Before creating new pages, components, or flows, conduct a thorough inventory of existing elements in the codebase. Search for similar functionality using relevant keywords and file patterns. Identify opportunities to reuse or extend existing components rather than creating duplicates. When similar features exist, analyze them to understand if they can be parameterized or adapted instead of duplicated. Maintain a mental model of the application’s structure to recognize when proposed solutions might create redundant elements. When similar pages or flows are needed, consider creating abstracted components that can be reused with different data or configurations, promoting DRY (Don’t Repeat Yourself) principles.

**Dead Code Elimination**

Actively identify and remove unused code rather than letting it accumulate. When replacing functionality, cleanly remove the old implementation instead of simply commenting it out or leaving it alongside new code. Before deleting code, verify its usage throughout the application by checking for imports and references. Use tools like dependency analysis when available to confirm code is truly unused. When refactoring, track deprecated methods and ensure they’re properly removed once no longer referenced. Regularly scan for orphaned components, unused imports, commented-out blocks, and unreachable conditions. When suggesting code removal, provide clear reasoning for why it’s considered dead code and confirm there are no subtle dependencies before deletion. Maintain cleanliness in the codebase by prioritizing elimination of code paths that are no longer executed.

**Preserving Working Features**

Treat working features as locked systems that require explicit permission to modify. Before suggesting changes to any functioning component, clearly identify its boundaries and dependencies. Never remove or substantially alter features that are currently operational without explicit direction. When errors occur in one area, avoid making “just in case” changes to unrelated working components. Maintain a clear understanding of which parts of the application are stable and which are under development. Use a feature-focused approach where changes are isolated to specific feature sets without bleeding into others. When modifying shared components used by multiple features, ensure all dependent features continue functioning as expected. Create safeguards by thoroughly documenting cross-feature dependencies before making modifications that might affect them. Always explicitly confirm intent before suggesting changes to established, functional parts of the application.

**Deep Problem-Solving Approach**

When encountering complex errors, resist the temptation to apply immediate fixes without deeper understanding. Take a deliberate step back to examine the problem from multiple perspectives before proposing solutions. Consider fundamentally different approaches rather than minor variations of the same strategy. Document at least three potential solutions with their pros and cons before recommending a specific approach. Question initial assumptions about the cause of errors, especially when standard fixes don’t work. Consider unconventional sources of issues such as environment configurations, external dependencies, or race conditions that might not be immediately obvious. Try reversing your thinking: instead of asking “why isn’t this working?”, ask “under what conditions would this behavior actually make sense?”. Break complex problems into smaller components that can be verified independently. Implement targeted debugging strategies such as logging, breakpoints, or state tracing to gather more information when the source of an error remains unclear. Be willing to propose experimental fixes as learning opportunities rather than definitive solutions when dealing with particularly obscure issues.

**Database Query Verification**

Before suggesting any database query or schema modification, always verify the current state of the database first. Examine existing tables, fields, and relationships to ensure you’re not recommending the creation of elements that already exist. When suggesting queries, first check if similar queries exist in the codebase that can be adapted. Review existing data models, migration files, and schema definitions to build an accurate understanding of the database structure. For any proposed table creation, explicitly confirm that the table doesn’t already exist and explain why a new table is necessary rather than modifying an existing one. When suggesting field additions, verify that similar fields don’t already serve the same purpose under different names. Consider database performance implications of suggested queries and provide optimized alternatives when appropriate. Always contextualize query suggestions within the existing database architecture rather than treating them as isolated operations.

**UI Consistency and Theming**

Maintain strict adherence to the established design system and color palette throughout the application. Before creating new UI components, study existing ones to understand the visual language, spacing patterns, interaction models, and theming approach. When implementing new interfaces, reuse existing component patterns rather than creating visual variations. Extract color values, typography, spacing, and other design tokens from the existing codebase rather than introducing new values. Ensure consistent handling of states (hover, active, disabled, error, etc.) across all components. Respect the established responsive behavior patterns when implementing new layouts. When suggesting UI improvements, ensure they enhance rather than disrupt the visual cohesion of the application. Maintain accessibility standards consistently across all components, including color contrast ratios, keyboard navigation, and screen reader support. Document any component variations and their appropriate usage contexts to facilitate consistent application. When introducing new visual elements, explicitly demonstrate how they integrate with and complement the existing design system rather than standing apart from it.

**Systematic Debugging Approach**

When encountering errors, adopt a scientific debugging methodology rather than making random changes. Start by reproducing the exact issue in a controlled environment. Gather comprehensive data including console logs, network requests, component state, and error messages. Form multiple hypotheses about potential causes and test each systematically. Isolate the problem by narrowing down affected components and identifying trigger conditions. Document your debugging process and findings for future reference. Use appropriate debugging tools including browser developer tools, React DevTools, and code-level debugging techniques. Always verify that your solution completely resolves the issue without introducing new problems or regressions elsewhere in the application.

**Type Safety and Data Validation**

Before implementing any functionality, thoroughly analyze type definitions from both database schema and TypeScript interfaces. Maintain strict type checking throughout the codebase, avoiding ‘any’ type as an escape hatch. When working with data transformations, verify type safety at each step of the pipeline. Pay special attention to common type mismatches like database numbers coming in as strings, date parsing requirements, and handling of nullable fields. Implement consistent naming conventions between database columns and TypeScript interfaces. Document complex type relationships and special handling requirements. Test with real data shapes and verify edge cases, particularly null/undefined handling. When errors occur, trace the data transformation pipeline to identify exactly where types diverge and suggest fixes that maintain type safety.

**Data Flow Management**

Conceptualize data flow as a complete pipeline from database through API and state to UI. When implementing features, carefully track how data is transformed at each stage. Implement proper query invalidation patterns to ensure UI remains synchronized with database state. Add strategic console logs at critical points to monitor data transitions. Create clear mental models of when and how data should update in response to actions. Pay careful attention to caching strategies and potential stale data issues. When debugging flow problems, methodically follow the data journey from source to destination. Check timing issues, race conditions, and transformation errors. Verify that the final data shape reaching components matches what they expect. Implement robust error boundaries and loading state management to maintain UI stability during data flow disruptions.

**Performance Optimization**

Monitor application performance proactively rather than waiting for issues to become severe. Review query caching strategies to minimize unnecessary database calls. Check for and eliminate unnecessary component re-renders through proper memoization and dependency management. Analyze data fetching patterns for potential N+1 query problems, excessive waterfalls, or redundant requests. Implement virtualization for long lists and paginate large data sets. Optimize bundle size through code splitting and lazy loading. Compress and optimize assets including images. Use appropriate performance measurement tools to identify bottlenecks including React DevTools, Performance tab, Network panel, and Memory profiler. Focus optimization efforts on metrics that directly impact user experience such as load times, time to interactive, and UI responsiveness. Implement targeted performance improvements rather than premature optimization.

**Error Management and Resilience**

Implement a comprehensive error handling strategy that maintains application stability while providing meaningful feedback. Use try/catch blocks strategically around potentially problematic code sections. Create a hierarchy of error boundaries to contain failures within specific components rather than crashing the entire application. Design graceful degradation patterns where components can continue functioning with limited data. Provide clear, user-friendly error messages that explain the problem without technical jargon. Implement recovery mechanisms including retry logic, fallbacks, and state resets. Maintain robust error logging that captures sufficient context for debugging while respecting privacy. Test error scenarios thoroughly to ensure recovery mechanisms work as expected. When suggesting solutions, ensure they address the root cause rather than merely suppressing symptoms, and verify they work across all relevant environments and edge cases.

**Component Architecture**

Approach component design with a clear understanding of component hierarchy and responsibilities. Visualize components as a family tree with proper parent-child relationships. Minimize prop drilling by strategically using context or state management where appropriate. Implement clear boundaries between container (smart) and presentational (dumb) components. Establish consistent patterns for component communication including parent-child and sibling interactions. When debugging component issues, analyze the complete component tree, prop flow, state location, and event handler connections. Design components with single responsibility and clear interfaces. Document component relationships and dependencies to facilitate future maintenance. Implement performance optimizations including memoization, lazy loading, and code splitting where beneficial. Maintain a balance between component reusability and specialization to avoid both duplication and over-abstraction.

**API Integration and Network Management**

Approach API integration with a comprehensive strategy for requests, responses, and error handling. Verify authentication headers, parameters, and body format for each request. Implement proper error handling for all network operations with specific catches for different error types. Ensure consistent typing between request payloads, expected responses, and application state. Configure proper CORS settings and verify they work across all environments. Implement intelligent retry mechanisms for transient failures with exponential backoff. Consider rate limiting implications and implement appropriate throttling. Add strategic request caching to improve performance and reduce server load. Monitor network performance including request timing and payload sizes. Test API integrations against both happy paths and various failure scenarios. Maintain clear documentation of all API endpoints, their purposes, expected parameters, and response formats to facilitate future development and debugging.

Was this page helpful?

YesNo

**[Security best practices](https://docs.lovable.dev/tips-tricks/security-best-practices)**

[xgithublinkedinyoutubediscordreddit](https://www.reddit.com/r/lovable)

**Assistant**

Responses are generated using AI and may contain mistakes.