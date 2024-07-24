import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TokenEnergyContract } from './TokenEnergyContract';
import { WhitelistType } from './WhitelistType';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/optional';
import { Enum } from '../util/decorators/enum';
import { OcpiResponse, OcpiResponseStatusCode } from './ocpi.response';
import { PaginatedResponse } from './PaginatedResponse';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { TokenType } from './TokenType';
import { TokenDTO } from './DTO/TokenDTO';

@Table
export class OcpiToken extends Model {
  @Column({
    type: DataType.INTEGER,
    unique: true,
  })
  authorization_id!: number;

  @Column(DataType.STRING)
  @MaxLength(2)
  @MinLength(2)
  @IsString()
  @IsNotEmpty()
  country_code!: string;

  @Column(DataType.STRING)
  @MaxLength(3)
  @IsString()
  @IsNotEmpty()
  party_id!: string;

  @Column(DataType.STRING)
  @Enum(TokenType, 'TokenType')
  @IsNotEmpty()
  type!: TokenType;

  @Column(DataType.STRING)
  @MaxLength(64)
  @IsString()
  @Optional()
  visual_number?: string | null;

  @Column(DataType.STRING)
  @MaxLength(64)
  @IsString()
  @IsNotEmpty()
  issuer!: string;

  @Column(DataType.STRING)
  @Enum(WhitelistType, 'WhitelistType')
  @IsNotEmpty()
  whitelist!: WhitelistType;

  @Column(DataType.STRING)
  @IsString()
  @Optional()
  default_profile_type?: string | null;

  @Column(DataType.JSON)
  @Optional()
  @Type(() => TokenEnergyContract)
  @ValidateNested()
  energy_contract?: TokenEnergyContract | null;

  @Column(DataType.DATE)
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  last_updated!: Date; // TODO: we could try to use @UpdatedAt to avoid duplicated cols, last_updated and updatedAt
}

export class TokenResponse extends OcpiResponse<TokenDTO> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => TokenDTO)
  @ValidateNested()
  data!: TokenDTO;

  static build(
    statusCode: OcpiResponseStatusCode,
    data?: TokenDTO,
    message?: string,
  ): TokenResponse {
    const response = new TokenResponse();
    response.status_code = statusCode;
    response.data = data!;
    response.status_message = message;
    return response;
  }
}

export class PaginatedTokenResponse extends PaginatedResponse<TokenDTO> {
  @IsArray()
  @ValidateNested({each: true})
  @IsNotEmpty()
  @Optional(false)
  @Type(() => TokenDTO)
  data!: TokenDTO[];
}

export class SingleTokenRequest {
  @MaxLength(2)
  @MinLength(2)
  @IsString()
  @IsNotEmpty()
  country_code!: string;

  @MaxLength(3)
  @IsString()
  @IsNotEmpty()
  party_id!: string;

  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  uid!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  type!: TokenType;

  static build(
    country_code: string,
    party_id: string,
    uid: string,
    type?: TokenType,
  ): SingleTokenRequest {
    const request = new SingleTokenRequest();
    request.country_code = country_code;
    request.party_id = party_id;
    request.uid = uid;
    request.type = type ? type : TokenType.RFID;
    return request;
  }
}
