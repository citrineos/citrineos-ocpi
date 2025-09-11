// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { ServerCredentialsRoleSchema } from './ServerCredentialsRole';
import { ClientInformationSchema } from './ClientInformation';

export const CpoTenantSchema = z.object({
  serverCredentialsRoles: z.array(ServerCredentialsRoleSchema),
  clientInformation: z.array(ClientInformationSchema),
});

export type CpoTenant = z.infer<typeof CpoTenantSchema>;
