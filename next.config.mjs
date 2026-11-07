/** @type {import("next").NextConfig} */
const nextConfig = {
  // Emits .next/standalone: a self-contained server plus only the dependencies it actually
  // reaches, so the runtime image does not ship the whole node_modules tree.
  output: "standalone",
  experimental: {
    // Rewrite barrel imports to per-icon imports. The `ssr` entries (used by Server Components)
    // must be listed separately: each re-exports ~1,500 icons plus their ~1,500 definitions, and
    // without this every dev compile of a page that imports one icon from them processed all
    // ~3,000 modules (a probe page with five icons: 4,976 modules, 8.2s, against 1,960 without).
    optimizePackageImports: ["@phosphor-icons/react", "@phosphor-icons/react/dist/ssr", "@phosphor-icons/react/ssr"],
  },
};

export default nextConfig;
