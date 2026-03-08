import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Allowed commands (prefixes)
 */
const ALLOWED_PREFIXES = [
  'git', 'npm', 'npx', 'yarn', 'pnpm',
  'node', 'tsc', 'eslint', 'prettier',
  'cat', 'ls', 'dir', 'find', 'grep', 'head', 'tail', 'type',
  'python', 'pip', 'pytest',
  'go', 'cargo',
  'php', 'composer',
];

/**
 * Blocked patterns (never allow)
 */
const BLOCKED_PATTERNS = [
  /rm\s+(-rf|--recursive)\s+\//,
  /\bsudo\b/,
  /\bsu\b/,
  /\bcurl\b/,
  /\bwget\b/,
  /\bdocker\b/,
  /\bkubectl\b/,
  /\bssh\b/,
  /\bscp\b/,
  /\bkill\b/,
  /\breboot\b/,
  /\bshutdown\b/,
  /\brm\s+-rf\s+[\/~]/,
  /\bformat\b/,
  /\bdel\s+\/s/i,  // Windows: del /s
];

/**
 * Validate a command before execution.
 */
function validateCommand(command: string): { valid: boolean; reason?: string } {
  const trimmed = command.trim();
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `Blocked pattern: ${pattern}` };
    }
  }

  // Check allowed prefix
  if (!ALLOWED_PREFIXES.includes(firstWord)) {
    return { valid: false, reason: `Command '${firstWord}' not in allowed list` };
  }

  return { valid: true };
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

/**
 * Run a shell command in a sandboxed context.
 */
export async function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ShellResult> {
  // Validate
  const validation = validateCommand(command);
  if (!validation.valid) {
    return {
      stdout: '',
      stderr: `BLOCKED: ${validation.reason}`,
      exitCode: 1,
      timedOut: false,
    };
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: {
        ...process.env,
        // Prevent leaking sensitive env vars
        GEMINI_API_KEY: undefined,
        OPENAI_API_KEY: undefined,
        ANTHROPIC_API_KEY: undefined,
        GITHUB_TOKEN: undefined,
        DATABASE_URL: undefined,
        REDIS_URL: undefined,
        ENCRYPTION_KEY: undefined,
        JWT_SECRET: undefined,
      },
    });

    return {
      stdout: stdout.slice(0, 50_000), // cap output
      stderr: stderr.slice(0, 10_000),
      exitCode: 0,
      timedOut: false,
    };
  } catch (err: any) {
    return {
      stdout: (err.stdout || '').slice(0, 50_000),
      stderr: (err.stderr || err.message || '').slice(0, 10_000),
      exitCode: err.code ?? 1,
      timedOut: err.killed ?? false,
    };
  }
}

/**
 * Detect test framework from package.json or project files.
 */
export async function detectTestCommand(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync('cat package.json 2>/dev/null || type package.json 2>nul', { cwd });
    const pkg = JSON.parse(stdout);

    if (pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
      return 'npm test';
    }
    if (pkg.scripts?.['test:unit']) return 'npm run test:unit';

    // Check devDependencies for frameworks
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.jest) return 'npx jest --passWithNoTests';
    if (deps.vitest) return 'npx vitest run';
    if (deps.mocha) return 'npx mocha';
    if (deps.pytest || deps.python) return 'pytest';
  } catch {
    // Not a Node.js project or no package.json
  }

  // Check for Python
  try {
    await execAsync('ls pytest.ini setup.py pyproject.toml 2>/dev/null', { cwd });
    return 'pytest';
  } catch { /* ignore */ }

  return null;
}
