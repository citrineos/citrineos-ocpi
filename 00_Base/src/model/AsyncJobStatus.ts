import { z } from 'zod';

export enum AsyncJobName {
  FETCH_OCPI_TOKENS = 'FETCH_OCPI_TOKENS',
}

export const AsyncJobStatusSchema = z.object({
  jobId: z.string().uuid(),
  jobName: z.nativeEnum(AsyncJobName),
  mspCountryCode: z.string(),
  mspPartyId: z.string(),
  cpoCountryCode: z.string(),
  cpoPartyId: z.string(),
  finishedAt: z.date().optional(),
  stoppedAt: z.date().nullable().optional(),
  stopScheduled: z.boolean(),
  isFailed: z.boolean(),
  paginationParams: z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
  totalObjects: z.number().optional(),
});

export type AsyncJobStatus = z.infer<typeof AsyncJobStatusSchema>;
