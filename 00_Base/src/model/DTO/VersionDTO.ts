import { z } from 'zod';
import { VersionNumber } from '../VersionNumber';

export const VersionDTOSchema = z.object({
  version: z.nativeEnum(VersionNumber),
  url: z.string().url(),
});

export type VersionDTO = z.infer<typeof VersionDTOSchema>;
