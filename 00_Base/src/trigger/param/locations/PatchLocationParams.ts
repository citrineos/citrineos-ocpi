import { z } from 'zod';
import { LocationDTOSchema } from '../../../model/DTO/LocationDTO';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const PatchLocationParamsSchema = OcpiParamsSchema.extend({
  locationId: z.string().length(36),
  requestBody: LocationDTOSchema.partial(),
});

export type PatchLocationParams = z.infer<typeof PatchLocationParamsSchema>;
