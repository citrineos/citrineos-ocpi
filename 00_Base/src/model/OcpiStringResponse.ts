import { z } from 'zod';
import { OcpiResponseSchema } from './OcpiResponse';

export const OcpiStringResponseSchema = OcpiResponseSchema(z.string());

export type OcpiStringResponse = z.infer<typeof OcpiStringResponseSchema>;
