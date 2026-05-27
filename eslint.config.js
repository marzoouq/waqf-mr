import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "@typescript-eslint/no-explicit-any": "warn",
      "eqeqeq": ["error", "always"],
      "no-console": "error",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "src/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "no-console": "off",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["src/lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["supabase/functions/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: [
      "src/components/settings/MenuCustomizationTab.tsx",
      "src/components/ui/badge.tsx",
      "src/components/ui/button.tsx",
      "src/components/ui/form.tsx",
      "src/components/ui/navigation-menu.tsx",
      "src/components/ui/sidebar.tsx",
      "src/components/ui/sonner.tsx",
      "src/components/ui/toggle.tsx",
      "src/contexts/AuthContext.tsx",
      "src/contexts/FiscalYearContext.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // M3.5 + Wave 7 — حماية الطبقات: ممنوع supabase خام أو ألوان hex داخل pages/components.
  // الاستثناءات (ignores): ملفات Canvas/SVG/PDF.
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: [
      "src/components/invoices/InvoicePreviewDialog.tsx",
      "src/components/expenses/vouchers/SignaturePad.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='from']",
          message: "Do not call supabase.from() inside pages/components. Use a hook from src/hooks/data/ that delegates to src/lib/services/.",
        },
        {
          selector: "MemberExpression[object.name='supabase'][property.name='auth']",
          message: "Do not access supabase.auth inside pages/components. Use useAuth() from @/hooks/auth/useAuthContext.",
        },
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message: "ممنوع استخدام ألوان hex مباشرة. استخدم hsl(var(--token)) من design system. الاستثناء: Canvas/SVG/PDF فقط مع إضافة الملف لـ allowlist.",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{6}/]",
          message: "ممنوع استخدام ألوان hex داخل template strings. استخدم hsl(var(--token)).",
        },
      ],
      "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  // Wave 8 — utils/ نقي: ممنوع toast و supabase.
  {
    files: ["src/utils/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "sonner", message: "ممنوع استيراد sonner داخل utils/. أعد نتيجة والطبقة المستدعية تُشعر." },
          ],
          patterns: [
            { group: ["@/integrations/supabase/*"], message: "ممنوع استيراد supabase داخل utils/. استخدم lib/services/." },
          ],
        },
      ],
    },
  },
  // Wave 8 — hooks/data/ بدون toast (تحذير).
  {
    files: ["src/hooks/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='from']",
          message: "Prefer extracting supabase.from() into src/lib/services/. Add a documented eslint-disable line if intentional.",
        },
      ],
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            { name: "sonner", message: "hooks/data نقي بدون toast — الإشعارات في hooks/page/." },
          ],
        },
      ],
    },
  },
  // Wave 8 — hooks/domain/ منطق حسابات فقط، بدون supabase.
  {
    files: ["src/hooks/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/integrations/supabase/*"], message: "hooks/domain/ منطق حسابات فقط — استخدم hooks/data/ للوصول إلى supabase." },
          ],
        },
      ],
    },
  },
  // Wave 8 — حدود الحجم.
  {
    files: ["src/hooks/page/**/*.ts"],
    rules: {
      "max-lines": ["warn", { max: 180, skipBlankLines: true, skipComments: true }],
    },
  },

  // M6 — فصل الأدوار: لا يجوز للواقف استيراد hooks المستفيد والعكس.
  {
    files: ["src/hooks/page/waqif/**/*.{ts,tsx}", "src/pages/waqif/**/*.{ts,tsx}", "src/components/waqif/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/hooks/page/beneficiary/*", "@/hooks/page/beneficiary"],
              message: "Waqif must not import beneficiary hooks. Use @/hooks/application/dashboard/* for shared end-user logic.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/hooks/page/beneficiary/**/*.{ts,tsx}", "src/pages/beneficiary/**/*.{ts,tsx}", "src/components/beneficiary/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/hooks/page/waqif/*", "@/hooks/page/waqif"],
              message: "Beneficiary must not import waqif hooks. Use @/hooks/application/dashboard/* for shared end-user logic.",
            },
          ],
        },
      ],
    },
  },
);
