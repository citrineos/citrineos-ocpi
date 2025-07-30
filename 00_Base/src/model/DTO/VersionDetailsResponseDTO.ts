import { z } from 'zod';
import { VersionDetailsDTOSchema } from './VersionDetailsDTO';

export const VersionDetailsResponseDTOSchema = z.object({
  data: VersionDetailsDTOSchema,
  status_code: z.number(),
  status_message: z.string().optional(),
  timestamp: z.coerce.date(),
});

export type VersionDetailsResponseDTO = z.infer<
  typeof VersionDetailsResponseDTOSchema
>;
