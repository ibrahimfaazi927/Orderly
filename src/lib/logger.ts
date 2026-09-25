/**
 * Sanitize and mask sensitive values (keys, tokens, cards, signatures, passwords).
 */
const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "key",
  "authorization",
  "cookie",
  "signature",
  "cvv",
  "cardnumber",
  "cardNumber",
  "pan",
];

function sanitizeValue(key: string, value: any): any {
  if (value === null || value === undefined) return value;

  const lowerKey = key.toLowerCase();
  for (const pattern of SENSITIVE_KEYS) {
    if (lowerKey.includes(pattern)) {
      if (typeof value === "string") {
        if (value.length <= 8) return "******";
        return `${value.slice(0, 4)}...${value.slice(-4)}`;
      }
      return "******";
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const sanitizedObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitizedObj[k] = sanitizeValue(k, v);
    }
    return sanitizedObj;
  }

  if (Array.isArray(value)) {
    return value.map((item, idx) => sanitizeValue(String(idx), item));
  }

  return value;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

class OrderlyLogger {
  private formatLog(level: LogLevel, event: string, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? sanitizeValue("context", context) : undefined;
    return {
      timestamp,
      level: level.toUpperCase(),
      event,
      ...(sanitizedContext ? { context: sanitizedContext } : {}),
    };
  }

  info(event: string, context?: Record<string, any>) {
    console.log(JSON.stringify(this.formatLog("info", event, context)));
  }

  warn(event: string, context?: Record<string, any>) {
    console.warn(JSON.stringify(this.formatLog("warn", event, context)));
  }

  error(event: string, error?: any, context?: Record<string, any>) {
    const errorDetails = error
      ? {
          message: error.message || String(error),
          stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
        }
      : undefined;

    console.error(
      JSON.stringify(
        this.formatLog("error", event, {
          ...context,
          error: errorDetails,
        })
      )
    );
  }
}

export const logger = new OrderlyLogger();
