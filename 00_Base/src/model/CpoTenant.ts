import { z } from 'zod';
import { ServerCredentialsRoleSchema } from './ServerCredentialsRole';
import { ClientInformationSchema } from './ClientInformation';

export const CpoTenantSchema = z.object({
  serverCredentialsRoles: z.array(ServerCredentialsRoleSchema),
  clientInformation: z.array(ClientInformationSchema),
});

export type CpoTenant = z.infer<typeof CpoTenantSchema>;
