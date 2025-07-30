import { z } from 'zod';
import { VersionNumber } from '../VersionNumber';
import { EndpointSchema } from '../Endpoint';

export const VersionDetailsDTOSchema = z.object({
  version: z.nativeEnum(VersionNumber),
  endpoints: z.array(EndpointSchema).min(1),
});

export type VersionDetailsDTO = z.infer<typeof VersionDetailsDTOSchema>;
