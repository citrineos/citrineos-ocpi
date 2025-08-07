import { z } from 'zod';
import { ModuleId } from './ModuleId';
import { InterfaceRole } from './InterfaceRole';

export const EndpointSchema = z.object({
  identifier: z.nativeEnum(ModuleId),
  role: z.nativeEnum(InterfaceRole),
  url: z.string().url(),
});

export type Endpoint = z.infer<typeof EndpointSchema>;
