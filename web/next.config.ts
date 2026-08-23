import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root also has a package-lock.json (for the combined dev script),
  // so Turbopack would otherwise infer the wrong workspace root.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
