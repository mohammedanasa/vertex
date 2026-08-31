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
    // Vendored skill reference material, not application source.
    "agent/**",
    ".agents/**",
    // The Studio is its own workspace with its own tooling. Its built bundles
    // in studio/dist are large enough to exhaust the linter's heap.
    "studio/**",
  ]),
]);

export default eslintConfig;
