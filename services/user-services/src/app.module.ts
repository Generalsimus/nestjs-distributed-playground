import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { config } from './config';
import { UserService } from '@/shared/proto/gen/ts/user/v1/user_pb';
@Module({
  imports: [
    ClientsModule.register([
      // {
      //   name: UserService.name,
      //   transport: Transport.RMQ,
      //   options: {
      //     urls: [config.RABBITMQ_URL],
      //     queue: UserService.name,
      //     exchange: 'user.events',
      //     exchangeType: 'topic',
      //     queueOptions: { durable: true },
      //   },
      // }, 
      {
        name: UserService.name,
        transport: Transport.NATS,
        options: {
          servers: [config.NATS_URL],
          user: config.NATS_USER,
          pass: config.NATS_PASS,
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
