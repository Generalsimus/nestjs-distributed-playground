import { createValidator } from '@bufbuild/protovalidate';
import { fromJson, JsonObject, JsonValue } from '@bufbuild/protobuf';
import { pathToString } from '@bufbuild/protobuf/reflect';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Observable, throwError } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { DescMessage, MessageShape } from '@bufbuild/protobuf';

export const VALIDATE_KEY = 'grpc-validate:schema';
export const Validate = (schema: DescMessage) => SetMetadata(VALIDATE_KEY, schema);

const validator = createValidator();

function toMessage<T extends DescMessage>(schema: T, data: JsonObject): MessageShape<T> {
  const json: JsonValue = {};
  for (const field of schema.fields) {
    if (field.jsonName in data) json[field.jsonName] = data[field.jsonName];
    else if (field.name in data) json[field.jsonName] = data[field.name];
  }
  return fromJson(schema, json, { ignoreUnknownFields: true });
}

@Injectable()
export class ProtoValidationInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'rpc') return next.handle();

    const schema = this.reflector.get<DescMessage>(VALIDATE_KEY, context.getHandler());
    if (!schema) {
      return throwError(() => new RpcException({ code: status.INVALID_ARGUMENT, message: 'Validation schema not found for this method' }));
    }

    const raw = context.switchToRpc().getData<JsonObject>();
    const message = toMessage(schema, raw);
    const result = validator.validate(schema, message);

    if (result.kind === 'invalid') {
      const error = new RpcException({
        code: status.INVALID_ARGUMENT,
        message: result.violations.map((v) => v.toString() + ` (at ${pathToString(v.field)})`).join('; '),
      });
      return throwError(() => error);
    }

    if (result.kind === 'error') {
      return throwError(() => new RpcException({ code: status.INTERNAL, message: result.error.message }));
    }

    return next.handle();
  }
}
