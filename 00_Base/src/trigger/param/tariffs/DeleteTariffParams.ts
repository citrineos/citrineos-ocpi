import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const DeleteTariffParamsSchema = OcpiParamsSchema.extend({
  tariffId: z.string().length(36),
});

export type DeleteTariffParams = z.infer<typeof DeleteTariffParamsSchema>;
