import * as z from 'zod';

const schema = z.object({
  PORT: z.string(),
  RABBITMQ_URL: z.string(),
  NATS_URL: z.string(),
  NATS_USER: z.string(),
  NATS_PASS: z.string(),
  DATABASE_URL: z.string(),
});

export const config = schema.parse(process.env);
