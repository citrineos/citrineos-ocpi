// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { SchemaStore } from './schema.store';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import { defaultClassValidatorJsonSchemaOptions } from './class.validator';
import { VersionNumber, VersionNumberEnumName } from '../model/VersionNumber';
import { SchemaObject } from 'openapi3-ts';

const generatedSchemas = validationMetadatasToSchemas(
  defaultClassValidatorJsonSchemaOptions,
);

export const getAllSchemas = () => ({
  [VersionNumberEnumName]: {
    type: 'string',
    enum: Object.values(VersionNumber),
  } as SchemaObject,
  ...generatedSchemas,
  ...SchemaStore.getAllSchemas(),
});
