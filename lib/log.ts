/**
 * Centralized logger.
 *
 * Replaces scattered `console.log` / `console.error` calls. Each log carries
 * a stable `scope` tag so it's easy to grep / filter (`[scope]` prefix).
 *
 * Levels:
 *  - debug : noisy, off in production
 *  - info  : normal flow milestones (kept on in production)
 *  - warn  : recoverable issues
 *  - error : exceptions, broken flows
 *
 * Control verbosity with `LOG_LEVEL` (server) or `NEXT_PUBLIC_LOG_LEVEL` (client).
 * Default = "info" in production, "debug" elsewhere.
 *
 *     const log = makeLog('cron:notify');
 *     log.info('Started', { count });
 *     log.error('Failed', err);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function resolveLevel(): LogLevel {
  const fromEnv =
    (typeof process !== 'undefined' && (process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL)) ||
    '';
  if (fromEnv === 'debug' || fromEnv === 'info' || fromEnv === 'warn' || fromEnv === 'error') {
    return fromEnv;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const minLevel = LEVEL_ORDER[resolveLevel()];

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= minLevel;
}

function format(scope: string, msg: string): string {
  return `[${scope}] ${msg}`;
}

export interface Logger {
  debug: (msg: string, ...rest: unknown[]) => void;
  info: (msg: string, ...rest: unknown[]) => void;
  warn: (msg: string, ...rest: unknown[]) => void;
  error: (msg: string, ...rest: unknown[]) => void;
}

export function makeLog(scope: string): Logger {
  return {
    debug: (msg, ...rest) => shouldLog('debug') && console.debug(format(scope, msg), ...rest),
    info: (msg, ...rest) => shouldLog('info') && console.info(format(scope, msg), ...rest),
    warn: (msg, ...rest) => shouldLog('warn') && console.warn(format(scope, msg), ...rest),
    error: (msg, ...rest) => shouldLog('error') && console.error(format(scope, msg), ...rest),
  };
}
