/**
 * Structured JSON logger for Lambda.
 *
 * Emits one JSON object per log line so CloudWatch Logs Insights / Datadog
 * can query by level / traceId / userId / endpoint directly.
 *
 * We keep this zero-dependency (no pino, no winston) to avoid adding cold-
 * start weight. If/when we outgrow it, swap for @aws-lambda-powertools/logger.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const envLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel
const minLevel = LEVELS[envLevel] ?? LEVELS.info

export interface LogContext {
  traceId?: string
  userId?: string
  endpoint?: string
  [key: string]: unknown
}

function write(level: LogLevel, msg: string, ctx: LogContext = {}) {
  if (LEVELS[level] < minLevel) return
  const line = {
    level,
    msg,
    time: new Date().toISOString(),
    service: 'picsonar-backend',
    stage: process.env.STAGE ?? 'dev',
    ...ctx,
  }
  // Use stdout for info/debug; stderr for warn/error so they surface separately.
  const out = level === 'error' || level === 'warn' ? console.error : console.log
  try {
    out(JSON.stringify(line))
  } catch {
    // Circular refs — fall back to string coercion.
    out(`${line.level} ${line.msg}`)
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => write('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => write('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => write('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => write('error', msg, ctx),

  /** Returns a bound logger that merges `base` into every subsequent log. */
  child(base: LogContext) {
    const merge = (ctx?: LogContext): LogContext => ({ ...base, ...ctx })
    return {
      debug: (m: string, c?: LogContext) => write('debug', m, merge(c)),
      info: (m: string, c?: LogContext) => write('info', m, merge(c)),
      warn: (m: string, c?: LogContext) => write('warn', m, merge(c)),
      error: (m: string, c?: LogContext) => write('error', m, merge(c)),
    }
  },
}

/**
 * Minimal metrics emitter that writes CloudWatch Embedded Metric Format
 * (EMF) blobs. CloudWatch auto-extracts numeric fields into custom metrics
 * without us needing the PutMetricData API.
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
 */
export function emitMetric(
  name: string,
  value: number,
  unit:
    | 'Count'
    | 'Milliseconds'
    | 'Bytes'
    | 'Percent' = 'Count',
  dims: Record<string, string> = {},
): void {
  const namespace = `PicSonar/${process.env.STAGE ?? 'dev'}`
  const dimNames = Object.keys(dims)
  const emf = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: namespace,
          Dimensions: dimNames.length ? [dimNames] : [],
          Metrics: [{ Name: name, Unit: unit }],
        },
      ],
    },
    [name]: value,
    ...dims,
  }
  console.log(JSON.stringify(emf))
}
