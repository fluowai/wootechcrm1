type LogLevel = "info" | "warn" | "error" | "debug";

const levels: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
};

const currentLevel = (process.env.LOG_LEVEL || "info").toLowerCase();

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= (levels[currentLevel as LogLevel] ?? 1);
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function writeLog(level: LogLevel, module: string, message: string, data?: unknown) {
  if (!shouldLog(level)) return;
  const entry = JSON.stringify({
    timestamp: formatTimestamp(),
    level,
    module,
    message,
    ...(data !== undefined ? { data } : {}),
  });
  const stream = level === "warn" || level === "error" ? process.stderr : process.stdout;
  stream.write(entry + "\n");
}

export const logger = {
  info: (module: string, message: string, data?: unknown) => writeLog("info", module, message, data),
  warn: (module: string, message: string, data?: unknown) => writeLog("warn", module, message, data),
  error: (module: string, message: string, data?: unknown) => writeLog("error", module, message, data),
  debug: (module: string, message: string, data?: unknown) => writeLog("debug", module, message, data),
};
