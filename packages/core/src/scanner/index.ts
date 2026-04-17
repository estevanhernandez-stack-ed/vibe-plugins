/**
 * Scanner — file walking, git scanning, artifact inventory
 *
 * Each Vibe plugin needs to walk a project's filesystem with consistent
 * behavior: respect .gitignore-equivalent ignore patterns, normalize
 * Windows backslash paths to forward slashes, allow specific dotfiles
 * (.claude-plugin, .github, .vibe-doc) through the dotfile filter, and
 * produce a uniform artifact inventory.
 *
 * Extraction status: STUB. Implementation will be lifted from
 * Vibe Doc's packages/vibe-doc/src/scanner/ during Phase 2 of the
 * monorepo migration. Until then, plugins that need scanner behavior
 * import from their own copies.
 */

export interface ScannerOptions {
  rootPath: string;
  maxDepth?: number;
  respectGitignore?: boolean;
  allowedDotfiles?: string[];
}

export interface Artifact {
  relativePath: string;
  absolutePath: string;
  category: string;
  sizeBytes: number;
  lastModified: string;
}

export interface ArtifactInventory {
  totalArtifacts: number;
  artifacts: Artifact[];
  rootPath: string;
  scannedAt: string;
}

export async function scan(_options: ScannerOptions): Promise<ArtifactInventory> {
  throw new Error('@626labs/plugin-core/scanner not yet implemented. Phase 2 extraction pending.');
}

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}
