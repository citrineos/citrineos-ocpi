// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { TokenType } from '../../../model/TokenType';
import { VersionNumber } from '../../../model/VersionNumber';
import { OcpiParamsSchema } from '../../util/OcpiParams';
import { LocationReferencesSchema } from '../../../model/LocationReferences';

export const PostTokenParamsSchema = OcpiParamsSchema.extend({
  tokenId: z.string().length(36),
  type: z.nativeEnum(TokenType).optional(),
  locationReferences: LocationReferencesSchema.optional(),
  version: z.nativeEnum(VersionNumber).optional(),
});

export type PostTokenParams = z.infer<typeof PostTokenParamsSchema>;
