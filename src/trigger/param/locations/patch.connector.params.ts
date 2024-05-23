import {OcpiParams} from '../../util/ocpi.params';
import {IsNotEmpty, IsString, Length} from 'class-validator';

export class PatchConnectorParams extends OcpiParams {

  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  locationId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  evseUId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  connectorId!: string;

  requestBody!: { [key: string]: object };
}