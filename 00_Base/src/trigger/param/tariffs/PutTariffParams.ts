import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';
import { TariffDTOSchema } from '../../../model/DTO/tariffs/TariffDTO';

export const PutTariffParamsSchema = OcpiParamsSchema.extend({
  tariffId: z.string().length(36),
  tariff: TariffDTOSchema,
});

export type PutTariffParams = z.infer<typeof PutTariffParamsSchema>;
