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
};

export default nextConfig;
