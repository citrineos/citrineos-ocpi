// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { ModuleId } from './ModuleId';
import { InterfaceRole } from './InterfaceRole';
import { VersionNumber } from './VersionNumber';

export const VersionEndpointSchema = z.object({
  identifier: z.nativeEnum(ModuleId),
  role: z.nativeEnum(InterfaceRole),
  url: z.string().url(),
  versionId: z.number(),
  version: z.nativeEnum(VersionNumber),
});
