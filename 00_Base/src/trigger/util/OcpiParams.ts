import { z } from 'zod';

export const OcpiParamsSchema = z.object({
  fromCountryCode: z.string().length(2),
  fromPartyId: z.string().length(3),
  toCountryCode: z.string().length(2),
  toPartyId: z.string().length(3),
});

export type OcpiParams = z.infer<typeof OcpiParamsSchema>;
