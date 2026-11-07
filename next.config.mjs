/** @type {import("next").NextConfig} */
const nextConfig = {
  // Emits .next/standalone: a self-contained server plus only the dependencies it actually
  // reaches, so the runtime image does not ship the whole node_modules tree.
  output: "standalone",
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
};

export default nextConfig;
