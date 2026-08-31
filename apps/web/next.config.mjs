import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Libraries that must exist exactly once in the bundle. @bystrobarista/core
// is a file: symlink, so webpack resolves core's imports from the package's
// REAL path (packages/core/…) upward — landing in the monorepo-root
// node_modules, where the workspace install of core's own deps lives. That
// yields two i18next instances (initI18n initialises one, useTranslation
// reads the other → raw keys in the UI), and the same split-brain risk for
// react/zustand/supabase-js.
// react/react-dom are deliberately NOT aliased: Next swaps in its own
// vendored React (with React.cache) for server components, and a blanket
// alias breaks that. Aliasing the libraries that IMPORT react is enough —
// their react resolution then starts from apps/web/node_modules.
const SINGLETONS = [
  "i18next",
  "react-i18next",
  "zustand",
  "@supabase/supabase-js",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // @bystrobarista/core ships raw TypeScript (main: index.ts) — Next must
  // compile it through the file: symlink instead of expecting prebuilt JS.
  transpilePackages: ["@bystrobarista/core"],
  // Verification builds (BB_DIST_DIR=.next-build npx next build) must never
  // write into the .next directory a running dev server is serving from —
  // clobbering it mid-request bricks the dev server with MODULE_NOT_FOUND.
  distDir: process.env.BB_DIST_DIR || ".next",
  webpack: (config) => {
    for (const dep of SINGLETONS) {
      config.resolve.alias[dep] = path.resolve(__dirname, "node_modules", dep);
    }
    return config;
  },
};

export default nextConfig;
