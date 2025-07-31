import { z } from 'zod';
import { OcpiParamsSchema } from '../../util/OcpiParams';
import { EvseDTOSchema } from '../../../model/DTO/EvseDTO';

export const PutEvseParamsSchema = OcpiParamsSchema.extend({
  locationId: z.string().length(36),
  evseUid: z.string().length(36),
  evse: EvseDTOSchema,
});

export type PutEvseParams = z.infer<typeof PutEvseParamsSchema>;
