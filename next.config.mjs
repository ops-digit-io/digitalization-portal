/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Ship the bundled skills/playbooks into the serverless runtime so the routes
  // that read them at runtime (registry sync, and the intake guideline/enhance
  // bundled fallback) find them on the live host, not just in local dev.
  experimental: {
    outputFileTracingIncludes: {
      "/api/registry/sync": ["./skills/**/*", "./playbooks/**/*"],
      "/api/intake/turn": ["./skills/**/*", "./playbooks/**/*"],
      "/api/intake/enhance": ["./playbooks/**/*"],
      // The Process Funnel routes read their coaching stance + tool playbook from
      // the ./playbooks registry (bundled fallback) at runtime — ship it. The
      // Kriterienkatalog and Ablauf are TypeScript modules, bundled automatically.
      "/api/process/**": ["./playbooks/**/*"],
    },
  },
  webpack: (config) => {
    // The lib/ modules use explicit `.js` ESM specifiers that point at `.ts`
    // sources. Teach webpack to resolve them (esbuild/vitest already do).
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
