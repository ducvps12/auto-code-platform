import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Read a file from the workspace.
 */
export async function readFile(workDir: string, filePath: string): Promise<string> {
  const fullPath = path.resolve(workDir, filePath);
  // Security: prevent path traversal
  if (!fullPath.startsWith(path.resolve(workDir))) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }
  return fs.readFile(fullPath, 'utf-8');
}

/**
 * Write content to a file in the workspace.
 */
export async function writeFile(workDir: string, filePath: string, content: string): Promise<void> {
  const fullPath = path.resolve(workDir, filePath);
  if (!fullPath.startsWith(path.resolve(workDir))) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
}

/**
 * List all files in a directory recursively. Returns relative paths.
 */
export async function listFiles(workDir: string, options?: {
  maxDepth?: number;
  exclude?: RegExp[];
}): Promise<string[]> {
  const maxDepth = options?.maxDepth ?? 10;
  const exclude = options?.exclude ?? [
    /node_modules/,
    /\.git\//,
    /dist\//,
    /build\//,
    /\.next\//,
    /coverage\//,
    /__pycache__/,
    /\.venv/,
    /vendor\//,
  ];

  const files: string[] = [];

  async function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(workDir, fullPath).replace(/\\/g, '/');

      // Check exclusion
      if (exclude.some(rx => rx.test(relativePath))) continue;

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await walk(workDir, 0);
  return files.sort();
}

/**
 * Get file tree as a formatted string (for LLM context).
 */
export async function getFileTree(workDir: string, maxFiles: number = 200): Promise<string> {
  const files = await listFiles(workDir);
  const limited = files.slice(0, maxFiles);
  const tree = limited.join('\n');

  if (files.length > maxFiles) {
    return `${tree}\n... and ${files.length - maxFiles} more files`;
  }
  return tree;
}

/**
 * Read multiple files at once (for context building).
 */
export async function readFiles(workDir: string, filePaths: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const fp of filePaths) {
    try {
      result[fp] = await readFile(workDir, fp);
    } catch {
      result[fp] = '(file not found or unreadable)';
    }
  }
  return result;
}

/**
 * Check if a file exists in the workspace.
 */
export async function fileExists(workDir: string, filePath: string): Promise<boolean> {
  const fullPath = path.resolve(workDir, filePath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}
