import './telemetry';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import path from 'path';
import { config } from './config';
import { ProtoValidationInterceptor } from '@/src/interceptor/proto-validate';
import { Reflector } from '@nestjs/core';
import { UserService } from '@/shared/proto/gen/ts/user/v1/user_pb';
import { RmqTraceInterceptor } from '@/src/interceptor/rmq-trace';
import { OtelLogger } from '@/src/otel-logger';
import { DLX_EXCHANGE, setupRmqDlx } from '@/src/rmq-dlx-setup';

async function bootstrap() {
  const protoDir = path.join(process.cwd(), './shared/proto');

  await setupRmqDlx(config.RABBITMQ_URL);

  const app = await NestFactory.create(AppModule);
  app.useLogger(new OtelLogger());

  app.useGlobalInterceptors(new RmqTraceInterceptor(), new ProtoValidationInterceptor(app.get(Reflector)));
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: 'user.v1',
        protoPath: path.join(protoDir, 'user/v1/user.proto'),
        url: `0.0.0.0:${config.PORT}`,
        loader: {
          keepCase: false,
          longs: Number,
          enums: String,
          defaults: true,
          oneofs: true,
          arrays: true,
          includeDirs: [path.join(protoDir, 'vendor'), protoDir],
        },
      },
    },
    { inheritAppConfig: true },
  );

  // app.connectMicroservice<MicroserviceOptions>(
  //   {
  //     transport: Transport.RMQ,
  //     options: {
  //       urls: [config.RABBITMQ_URL],
  //       queue: UserService.name,
  //       exchange: 'user.events',
  //       exchangeType: 'topic',
  //       noAck: false,
  //       queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': DLX_EXCHANGE } },
  //     },
  //   },
  //   { inheritAppConfig: true },
  // );

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.NATS,
      options: {
        servers: [config.NATS_URL],
        user: config.NATS_USER,
        pass: config.NATS_PASS,
        queue: UserService.name,
      },
    },
    { inheritAppConfig: true },
  );

  await app.startAllMicroservices();
}
void bootstrap();
