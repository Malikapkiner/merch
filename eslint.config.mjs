import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "drizzle/**", "next-env.d.ts"] },
  {
    // Deep modules: reach into a module only through its index.ts.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/modules/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/*", "**/modules/*/*"],
              message: "Import a module only through its public interface (@/modules/<name>).",
            },
          ],
        },
      ],
    },
  },
  {
    // Modules must not depend on the UI shell or on other modules' internals.
    files: ["src/modules/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/app/*", "@/app"], message: "Modules must not import from the UI layer." },
            {
              group: ["@/modules/*/*"],
              message: "Import other modules only through their public interface (@/modules/<name>).",
            },
          ],
        },
      ],
    },
  },
];

export default config;
