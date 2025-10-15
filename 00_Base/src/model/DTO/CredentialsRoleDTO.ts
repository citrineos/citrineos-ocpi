// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { BusinessDetailsSchema } from '../BusinessDetails';
import { Role } from '../Role';

export const CredentialsRoleDTOSchema = z.object({
  role: z.nativeEnum(Role),
  party_id: z.string().length(3),
  country_code: z.string().length(2),
  business_details: BusinessDetailsSchema,
});

export type CredentialsRoleDTO = z.infer<typeof CredentialsRoleDTOSchema>;
