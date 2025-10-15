// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { AuthorizationInfoAllowed } from './AuthorizationInfoAllowed';
import { TokenDTOSchema } from './DTO/TokenDTO';
import { DisplayTextSchema } from './DisplayText';
import { LocationReferencesSchema } from './LocationReferences';
import { OcpiResponseSchema } from './OcpiResponse';

export const AuthorizationInfoSchema = z.object({
  allowed: z.nativeEnum(AuthorizationInfoAllowed),
  token: TokenDTOSchema,
  authorization_reference: z.string(),
  info: DisplayTextSchema.optional(),
  location: LocationReferencesSchema.optional(),
});

export type AuthorizationInfo = z.infer<typeof AuthorizationInfoSchema>;

export const AuthorizationInfoResponseSchema = OcpiResponseSchema(
  AuthorizationInfoSchema,
);

export type AuthorizationInfoResponse = z.infer<
  typeof AuthorizationInfoResponseSchema
>;
