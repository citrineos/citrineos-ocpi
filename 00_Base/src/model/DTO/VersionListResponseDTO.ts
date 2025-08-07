import { OcpiResponseSchema } from '../OcpiResponse';
import { VersionDTOSchema } from './VersionDTO';
import { z } from 'zod';

export const VersionListResponseDTOSchema = OcpiResponseSchema(
  z.array(VersionDTOSchema),
);
export const VersionListResponseDTOSchemaName = 'VersionListResponseDTOSchema';

export type VersionListResponseDTO = z.infer<
  typeof VersionListResponseDTOSchema
>;
