import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { context, propagation, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Channel, Message } from 'amqplib';
import { Observable } from 'rxjs';

const tracer = trace.getTracer('user-service');

@Injectable()
export class RmqTraceInterceptor implements NestInterceptor {
  intercept(execCtx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const rpcCtx = execCtx.switchToRpc().getContext<unknown>();
    if (!(rpcCtx instanceof RmqContext)) return next.handle();

    const msg = rpcCtx.getMessage() as Message;
    const channel: Channel = rpcCtx.getChannelRef();
    const headers = msg?.properties?.headers ?? {};
    const parentCtx = propagation.extract(context.active(), headers);

    return new Observable((sub) => {
      return tracer.startActiveSpan(String(rpcCtx.getPattern()), { kind: SpanKind.CONSUMER }, parentCtx, (span) => {
        next.handle().subscribe({
          next: (v) => sub.next(v),
          error: (e: unknown) => {
            const errMsg = e instanceof Error ? e.message : String(e);
            span.recordException(e instanceof Error ? e : new Error(errMsg));
            span.setStatus({ code: SpanStatusCode.ERROR, message: errMsg });
            span.end();
            // nack without requeue → message routes to DLX instead of being dropped
            channel.nack(msg, false, false);
            sub.error(e);
          },
          complete: () => {
            channel.ack(msg);
            span.end();
            sub.complete();
          },
        });
      });
    });
  }
}
