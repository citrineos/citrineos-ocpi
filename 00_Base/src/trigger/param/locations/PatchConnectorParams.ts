import { OcpiParams } from '../../util/OcpiParams';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ConnectorDTO } from '../../../model/DTO/ConnectorDTO';

export class PatchConnectorParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  locationId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  evseUid!: string;

  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  connectorId!: string;

  requestBody!: Partial<ConnectorDTO>;

  static build(
    locationId: number,
    evseUid: string,
    connectorId: number,
    connector: Partial<ConnectorDTO>,
  ): PatchConnectorParams {
    const params = new PatchConnectorParams();
    params.locationId = String(locationId);
    params.evseUid = evseUid;
    params.connectorId = String(connectorId);
    params.requestBody = connector;
    return params;
  }
}
