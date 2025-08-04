import { z } from 'zod';
import { ConnectorDTOSchema } from '../../../model/DTO/ConnectorDTO';
import { OcpiParamsSchema } from '../../util/OcpiParams';

export const PutConnectorParamsSchema = OcpiParamsSchema.extend({
  locationId: z.string().length(36),
  evseUid: z.string().length(36),
  connectorId: z.string().length(36),
  connector: ConnectorDTOSchema,
});

export type PutConnectorParams = z.infer<typeof PutConnectorParamsSchema>;
