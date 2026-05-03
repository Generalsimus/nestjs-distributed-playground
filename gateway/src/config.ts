import * as z from 'zod';

const schema = z.object({
  PORT: z.number().default(3000),
});

export const config = schema.parse(process.env);
