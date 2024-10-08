import { OcpiParams } from '../../util/OcpiParams';
import { IsNotEmpty, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorDTO } from '../../../model/DTO/ConnectorDTO';

export class PutConnectorParams extends OcpiParams {
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

  @IsNotEmpty()
  @Type(() => ConnectorDTO)
  @ValidateNested()
  connector!: ConnectorDTO;

  static build(
    locationId: number,
    evseUid: string,
    connectorId: number,
    connector: ConnectorDTO,
  ): PutConnectorParams {
    const params = new PutConnectorParams();
    params.locationId = String(locationId);
    params.evseUid = evseUid;
    params.connectorId = String(connectorId);
    params.connector = connector;
    return params;
  }
}
