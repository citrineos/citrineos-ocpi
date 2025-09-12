// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Body } from 'routing-controllers';
import { z } from 'zod';

export const BODY_PARAM = 'BodyParam';
export const BodyWithSchema = (schema: z.ZodSchema<any>, name: string) =>
  function (object: NonNullable<unknown>, methodName: string, index: number) {
    // Apply the standard @Params() decorator
    Body()(object, methodName, index);

    // Add custom metadata for additional use cases
    Reflect.defineMetadata(
      BODY_PARAM,
      {
        schema,
        name,
      },
      object,
      `${methodName}.${index}`,
    );
  };
