import globals from "globals";
import pluginJs from "@eslint/js";
import jestPlugin from "eslint-plugin-jest";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
    },
  },
  pluginJs.configs.recommended,
  {
    plugins: {
      jest: jestPlugin
    },
    rules: {
      ...jestPlugin.configs.recommended.rules // ใช้กฎแนะนำสำหรับ Jest
    },
    languageOptions: {
      ecmaVersion: 2021
    }
  }
];