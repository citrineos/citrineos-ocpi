import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {Column, DataType, Index, Model, Table} from 'sequelize-typescript';
import {CredentialsRole} from './CredentialsRole';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {OcpiResponse, OcpiResponseStatusCode} from '../util/ocpi.response';
import {Type} from 'class-transformer';

@Table
export class Credentials extends Model {
  static readonly MODEL_NAME: string = OcpiNamespace.Credentials;

  @Index
  @Column(DataType.STRING)
  @MaxLength(64)
  @IsString()
  @IsNotEmpty()
  token!: string;

  @Column(DataType.STRING)
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  url!: string;

  @Column(DataType.JSON)
  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ValidateNested({each: true})
  @Type(() => CredentialsRole)
  roles!: CredentialsRole[];
}

export class CredentialsResponse extends OcpiResponse<Credentials> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => Credentials)
  @ValidateNested()
  data!: Credentials;

  static build(
    status_code: OcpiResponseStatusCode,
    data?: Credentials,
    status_message?: string,
  ) {
    const response = new CredentialsResponse();
    response.status_code = status_code;
    response.status_message = status_message;
    response.data = data!;
    response.timestamp = new Date();
    return response;
  }
}

export class CredentialsListResponse extends OcpiResponse<Credentials[]> {
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => Credentials)
  data!: Credentials[];
}
