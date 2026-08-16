import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone admin portal build artifacts (own .next/out dirs)
    "admin-portal/.next/**",
    "admin-portal/out/**",
    // Generated crawl/export artifacts and browser binaries
    "exports/**",
    "scratch/**",
    "temp/**",
    "downloads/**",
    "pw-browsers/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
