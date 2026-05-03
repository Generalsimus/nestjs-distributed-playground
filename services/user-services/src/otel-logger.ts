import { ConsoleLogger } from '@nestjs/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export class OtelLogger extends ConsoleLogger {
  log(message: unknown, context?: string) {
    super.log(message, context);
    trace.getActiveSpan()?.addEvent(String(message), { 'log.level': 'log', 'log.context': context ?? this.context ?? '' });
  }

  warn(message: unknown, context?: string) {
    super.warn(message, context);
    trace.getActiveSpan()?.addEvent(String(message), { 'log.level': 'warn', 'log.context': context ?? this.context ?? '' });
  }

  error(message: unknown, stack?: string, context?: string) {
    super.error(message, stack, context);
    const span = trace.getActiveSpan();
    if (span) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(message) });
      span.addEvent(String(message), { 'log.level': 'error', 'log.context': context ?? this.context ?? '', 'log.stack': stack ?? '' });
    }
  }

  debug(message: unknown, context?: string) {
    super.debug(message, context);
    trace.getActiveSpan()?.addEvent(String(message), { 'log.level': 'debug', 'log.context': context ?? this.context ?? '' });
  }

  verbose(message: unknown, context?: string) {
    super.verbose(message, context);
    trace.getActiveSpan()?.addEvent(String(message), { 'log.level': 'verbose', 'log.context': context ?? this.context ?? '' });
  }
}
