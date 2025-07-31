import { z } from 'zod';

export const OcpiConnectorSchema = z.object({
  connectorId: z.number(),
  evseId: z.string(),
  stationId: z.string(),
  lastUpdated: z.date(),
});

export type OcpiConnector = z.infer<typeof OcpiConnectorSchema>;
