import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // lab-core is consumed as TypeScript source from the workspace.
  transpilePackages: ['@stacknotes/lab-core'],
  // This repo ships its own AGENTS.md and CLAUDE.md at the root. Do not let Next
  // generate a second, conflicting copy inside the app directory.
  agentRules: false,
  turbopack: {
    // Both apps live in one pnpm workspace; point Turbopack at the workspace root
    // so it resolves the shared package and does not guess a root from lockfiles.
    root: path.join(import.meta.dirname, '..', '..', '..'),
  },
};

export default nextConfig;
