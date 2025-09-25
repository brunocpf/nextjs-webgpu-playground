import { FlatCompat } from "@eslint/eslintrc";
import checkFile from "eslint-plugin-check-file";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [{
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}, ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"), {
  plugins: {
    "check-file": checkFile,
  },
  rules: {
    "check-file/filename-naming-convention": [
      "error",
      {
        "src/**/*.{ts,tsx}": "KEBAB_CASE",
      },
    ],
    "check-file/folder-naming-convention": [
      "error",
      {
        "src/**/": "KEBAB_CASE",
      },
    ],
  },
}];

export default eslintConfig;
