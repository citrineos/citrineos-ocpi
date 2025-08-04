import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const GetTariffParamsSchema = OcpiParamsSchema.extend({
  tariffId: z.string().length(36),
});

export type GetTariffParams = z.infer<typeof GetTariffParamsSchema>;
