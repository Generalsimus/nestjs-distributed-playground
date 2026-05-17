import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { config } from './config';
import { UserService } from '@/shared/proto/gen/ts/user/v1/user_pb';
import { JetstreamModule } from '@horizon-republic/nestjs-jetstream';

const SEC = 1_000_000_000n; // 1 second in nanoseconds (BigInt for safety)
const toNs = (s: number) => Number(BigInt(s) * SEC);

@Module({
  imports: [
    JetstreamModule.forRoot({
      servers: [config.NATS_URL],
      name: UserService.name,
      connectionOptions: {
        user: config.NATS_USER,
        pass: config.NATS_PASS,
      },
      events: {
        stream: {
          // library defaults: WorkQueue retention, max_msgs=50M, max_age=7d, 5GB max
          // do NOT set max_msgs here — 1000 would silently drop unprocessed messages
        },
        consumer: {
          // after 5 total delivery attempts the message is dead-lettered
          max_deliver: 5,
          // NATS will redeliver if no ack within 30 s
          ack_wait: toNs(30),
          // exponential backoff between retries: 5s → 15s → 30s → 60s
          backoff: [toNs(5), toNs(15), toNs(30), toNs(60)],
        },
      },
      dlq: {
        stream: {
          // keep dead-lettered messages for 30 days
          max_age: toNs(30 * 24 * 60 * 60),
        },
      },
    }),
    JetstreamModule.forFeature({ name: UserService.name }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
