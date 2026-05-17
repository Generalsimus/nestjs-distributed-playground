import './telemetry';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import path from 'path';
import { config } from './config';
import { ProtoValidationInterceptor } from '@/src/interceptor/proto-validate';
import { Reflector } from '@nestjs/core';
import { OtelLogger } from '@/src/otel-logger';
import { JetstreamStrategy } from '@horizon-republic/nestjs-jetstream';

async function bootstrap() {
  const protoDir = path.join(process.cwd(), './shared/proto');

  const app = await NestFactory.create(AppModule);
  app.useLogger(new OtelLogger());

  app.useGlobalInterceptors(new ProtoValidationInterceptor(app.get(Reflector)));
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

  app.connectMicroservice({ strategy: app.get(JetstreamStrategy) }, { inheritAppConfig: true });

  // 3. CRITICAL FOR SAFETY: Enable graceful shutdowns
  // If Docker restarts this container, this ensures NestJS tells NATS
  // "Stop sending me messages, I am shutting down!" before it dies.
  app.enableShutdownHooks();

  await app.startAllMicroservices();
}
void bootstrap();
