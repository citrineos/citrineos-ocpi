import { z } from 'zod';

export const ResponseUrlCorrelationIdSchema = z.object({
  correlationId: z.string(),
  responseUrl: z.string(),
  params: z.any().optional(),
});

export type ResponseUrlCorrelationId = z.infer<
  typeof ResponseUrlCorrelationIdSchema
>;
