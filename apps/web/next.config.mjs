/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // @bystrobarista/core ships raw TypeScript (main: index.ts) — Next must
  // compile it through the file: symlink instead of expecting prebuilt JS.
  transpilePackages: ["@bystrobarista/core"],
};

export default nextConfig;
