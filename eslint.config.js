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
  // M3.5 — حماية الطبقات: استدعاءات supabase الخام يجب ألا تصل لـ pages/components.
  // داخل hooks/data نسمح بها كتحذير فقط (للسماح باستثناءات موثقة مثل useFiscalYears).
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
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
      ],
    },
  },
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
    },
  },
);
