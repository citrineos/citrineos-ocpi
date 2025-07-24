import { Enum } from '../../util/decorators/Enum';
import { TokenType } from '../TokenType';
import { Optional } from '../../util/decorators/Optional';
import { WhitelistType } from '../WhitelistType';
import { TokenEnergyContract } from '../TokenEnergyContract';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OcpiResponse, OcpiResponseStatusCode } from '../..';
import { PaginatedResponse } from '../PaginatedResponse';

export class TokenDTO {
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

  @Enum(TokenType, 'TokenType')
  @IsString()
  @IsNotEmpty()
  type!: TokenType;

  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  contract_id!: string;

  @MaxLength(64)
  @IsString()
  @Optional()
  visual_number?: string | null;

  @MaxLength(64)
  @IsString()
  @IsNotEmpty()
  issuer!: string;

  @MaxLength(36)
  @IsString()
  @Optional()
  group_id?: string | null;

  @IsBoolean()
  @IsNotEmpty()
  valid!: boolean;

  @Enum(WhitelistType, 'WhitelistType')
  @IsNotEmpty()
  whitelist!: WhitelistType;

  @MaxLength(2)
  @MinLength(2)
  @IsString()
  @Optional()
  language?: string | null | undefined;

  @IsString()
  @Optional()
  default_profile_type?: string | null;

  @Optional()
  @Type(() => TokenEnergyContract)
  @ValidateNested()
  energy_contract?: TokenEnergyContract | null;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  last_updated!: Date;
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
    response.timestamp = new Date();
    return response;
  }
}

export class PaginatedTokenResponse extends PaginatedResponse<TokenDTO> {
  @IsArray()
  @ValidateNested({ each: true })
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
