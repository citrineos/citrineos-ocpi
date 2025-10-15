// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { VersionNumber } from '../../../model/VersionNumber';
import {
  CredentialsDTO,
  CredentialsDTOSchema,
} from '../../../model/DTO/CredentialsDTO';
import { OcpiRegistrationParamsSchema } from '../../util/OcpiRegistrationParams';

export const PutCredentialsParamsSchema = OcpiRegistrationParamsSchema.extend({
  credentials: CredentialsDTOSchema,
});

export type PutCredentialsParams = z.infer<typeof PutCredentialsParamsSchema>;

export const buildPutCredentialsParams = (
  version: VersionNumber,
  authorization: string,
  credentials: CredentialsDTO,
): PutCredentialsParams => ({
  authorization,
  version,
  credentials,
});
