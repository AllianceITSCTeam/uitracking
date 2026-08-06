import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import requireTestidOnInteractive from "./docs/standards/eslint-rules/require-testid-on-interactive.js";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dist-ts/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo",
      "pnpm-lock.yaml",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["packages/dashboard/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ["packages/dashboard/**/*.{tsx,jsx}"],
    plugins: {
      "ui-tracking": {
        rules: { "require-testid-on-interactive": requireTestidOnInteractive },
      },
    },
    rules: {
      "ui-tracking/require-testid-on-interactive": "warn",
    },
  },
  prettierConfig,
);
