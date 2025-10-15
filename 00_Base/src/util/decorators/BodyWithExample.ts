// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ZodTypeAny } from 'zod';
import { BodyWithSchema } from './BodyWithSchema';
import { generateMockForSchema } from '../../controllers/BaseController';

export const BODY_WITH_EXAMPLE_PARAM = 'BodyWithExample';

export const BodyWithExample = (schema: ZodTypeAny, name: string) =>
  function (object: NonNullable<unknown>, methodName: string, index: number) {
    const example = generateMockForSchema(schema, name);
    BodyWithSchema(schema, name)(object, methodName, index);

    // Add custom metadata for additional use cases
    Reflect.defineMetadata(
      BODY_WITH_EXAMPLE_PARAM,
      example,
      object,
      methodName,
    );
  };
