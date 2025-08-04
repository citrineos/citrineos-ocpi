import { z } from 'zod';
import { OcpiResponseSchema } from './OcpiResponse';

export enum ChargingProfileResultType {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  UNKNOWN = 'UNKNOWN',
}

export const ChargingProfileResultSchema = z.object({
  result: z.nativeEnum(ChargingProfileResultType),
});

export const ChargingProfileResultResponseSchema = OcpiResponseSchema(
  ChargingProfileResultSchema,
);

export type ChargingProfileResult = z.infer<typeof ChargingProfileResultSchema>;
export type ChargingProfileResultResponse = z.infer<
  typeof ChargingProfileResultResponseSchema
>;
