import { z } from 'zod';
import { VersionDetailsDTOSchema } from './VersionDetailsDTO';
import { OcpiResponseSchema } from '../OcpiResponse';

export const VersionDetailsResponseDTOSchema = OcpiResponseSchema(
  VersionDetailsDTOSchema,
);

export type VersionDetailsResponseDTO = z.infer<
  typeof VersionDetailsResponseDTOSchema
>;
