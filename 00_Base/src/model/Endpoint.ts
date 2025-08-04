import { z } from 'zod';
import { ModuleId } from './ModuleId';
import { InterfaceRole } from './InterfaceRole';
import { VersionNumber } from './VersionNumber';

export const EndpointSchema = z.object({
  identifier: z.nativeEnum(ModuleId),
  role: z.nativeEnum(InterfaceRole),
  url: z.string().url(),
  version: z.nativeEnum(VersionNumber),
});

export type Endpoint = z.infer<typeof EndpointSchema>;
