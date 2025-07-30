import { z } from 'zod';
import { ConnectorType } from '../ConnectorType';
import { ConnectorFormat } from '../ConnectorFormat';
import { PowerType } from '../PowerType';
import { OcpiResponseSchema } from '../OcpiResponse';

export const ConnectorDTOSchema = z.object({
  id: z.string().max(36),
  standard: z.nativeEnum(ConnectorType),
  format: z.nativeEnum(ConnectorFormat),
  power_type: z.nativeEnum(PowerType),
  max_voltage: z.number().int(),
  max_amperage: z.number().int(),
  max_electric_power: z.number().int().nullable().optional(),
  tariff_ids: z.array(z.string()).nullable().optional(),
  terms_and_conditions: z.string().url().nullable().optional(),
  last_updated: z.coerce.date(),
});

export const ConnectorResponseSchema = OcpiResponseSchema(ConnectorDTOSchema);
export const ConnectorListResponseSchema =
  OcpiResponseSchema(ConnectorDTOSchema);

export type ConnectorDTO = z.infer<typeof ConnectorDTOSchema>;
export type ConnectorResponse = z.infer<typeof ConnectorResponseSchema>;
export type ConnectorListResponse = z.infer<typeof ConnectorListResponseSchema>;
