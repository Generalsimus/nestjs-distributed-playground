import { connect } from 'amqplib';
import { Logger } from '@nestjs/common';
import { UserService } from '@/shared/proto/gen/ts/user/v1/user_pb';

export const DLX_EXCHANGE = 'user.events.dlx';
export const DLQ_NAME = `${UserService.name}.dlq`;

const logger = new Logger('RmqDlxSetup');

export async function setupRmqDlx(url: string): Promise<void> {
  const conn = await connect(url);
  const ch = await conn.createChannel();
  await ch.assertExchange(DLX_EXCHANGE, 'fanout', { durable: true });
  await ch.assertQueue(DLQ_NAME, { durable: true });
  await ch.bindQueue(DLQ_NAME, DLX_EXCHANGE, '#');
  await ch.close();
  await conn.close();
  logger.log(`DLX ready: exchange=${DLX_EXCHANGE} → queue=${DLQ_NAME}`);
}
