// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { VersionDetailsDTOSchema } from './VersionDetailsDTO';
import { OcpiResponseSchema } from '../OcpiResponse';

export const VersionDetailsResponseDTOSchema = OcpiResponseSchema(
  VersionDetailsDTOSchema,
);

export type VersionDetailsResponseDTO = z.infer<
  typeof VersionDetailsResponseDTOSchema
>;
