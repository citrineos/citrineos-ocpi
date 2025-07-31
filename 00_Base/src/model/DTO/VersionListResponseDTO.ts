import { OcpiResponseSchema } from '../OcpiResponse';
import { VersionDTOSchema } from './VersionDTO';
import { z } from 'zod';

export const VersionListResponseDTOSchema = OcpiResponseSchema(
  z.array(VersionDTOSchema),
);
export type VersionListResponseDTO = z.infer<
  typeof VersionListResponseDTOSchema
>;
