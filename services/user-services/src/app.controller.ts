import { Validate } from '@/src/interceptor/proto-validate';
import { Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, EventPattern, GrpcMethod, Payload } from '@nestjs/microservices';
import type { GetUserResponse, GetUserRequest, UserNotifyRequest } from '@/shared/proto/gen/ts/user/v1/user';
import { UserService, GetUserRequestSchema, UserNotifyRequestSchema } from '@/shared/proto/gen/ts/user/v1/user_pb';
import { trace } from '@opentelemetry/api';
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(@Inject(UserService.name) private readonly userEventsClient: ClientProxy) { }

  @GrpcMethod(UserService.name, UserService.method.getUser.localName)
  @Validate(GetUserRequestSchema)
  getUser(request: GetUserRequest): GetUserResponse {
    trace.getActiveSpan()?.setAttributes({ 'user.id': request.userId, TESTTTTTTTTTTTTTTTTTTTTTTTTTTTT: 111111111111111 });

    this.userEventsClient.emit(UserService.method.userNotify.name, { userId: request.userId, message: 'user.fetched' }).subscribe();

    
    return {
      user: {
        userId: request.userId,
        email: 'test@example.com',
        name: 'Test User',
        age: 30,
      },
    };
  }

  // ── RabbitMQ consumer ──────────────────────────────────────────────
  // @MessagePattern(UserService.method.userNotify.name)
  @EventPattern(UserService.method.userNotify.name)
  @Validate(UserNotifyRequestSchema)
  handleUserNotify(@Payload() data: UserNotifyRequest) {
    trace.getActiveSpan()?.setAttributes({ 'user.id': data.userId, TESTTTTTTTTTTTTTTTTTTTTTTTTTTTT: 2222222222 });
    this.logger.log(`user.notify → userId=${data.userId} msg="${data.message}"`);
    return { received: true };
  }

}
