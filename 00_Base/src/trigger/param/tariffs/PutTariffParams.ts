import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const PutTariffParamsSchema = OcpiParamsSchema.extend({
  tariffId: z.string().length(36),
});

export type PutTariffParams = z.infer<typeof PutTariffParamsSchema>;
