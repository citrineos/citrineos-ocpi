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
import { TokenEnergyContract } from './TokenEnergyContract';
import { WhitelistType } from './WhitelistType';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/optional';
import { Enum } from '../util/decorators/enum';
import { OcpiResponse, OcpiResponseStatusCode } from './ocpi.response';
import { PaginatedResponse } from './PaginatedResponse';
import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { TokenType } from './TokenType';
import { TokenDTO } from './DTO/TokenDTO';

@Table
export class OCPIToken extends Model {
  static readonly MODEL_NAME: string = OcpiNamespace.Tokens;
  // OCPI 12.3.2 The combination of uid and type should be unique for every token within the eMSP’s system.
  @Column({ type: DataType.STRING, unique: 'uid_eMSP' })
  @MaxLength(2)
  @MinLength(2)
  @IsString()
  @IsNotEmpty()
  country_code!: string;

  @Column({ type: DataType.STRING, unique: 'uid_eMSP' })
  @MaxLength(3)
  @IsString()
  @IsNotEmpty()
  party_id!: string;

  @Column({ type: DataType.STRING, unique: 'uid_eMSP' })
  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  uid!: string;

  @Column({ type: DataType.STRING, unique: 'uid_eMSP' })
  @Enum(TokenType, 'TokenType')
  @IsNotEmpty()
  type!: TokenType;

  @Column(DataType.STRING)
  @MaxLength(36)
  @IsString()
  @IsNotEmpty()
  contract_id!: string;

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
  @MaxLength(36)
  @IsString()
  @Optional()
  group_id?: string | null;

  @Column(DataType.BOOLEAN)
  @IsBoolean()
  @IsNotEmpty()
  valid!: boolean;

  @Column(DataType.STRING)
  @Enum(WhitelistType, 'WhitelistType')
  @IsNotEmpty()
  whitelist!: WhitelistType;

  @Column(DataType.STRING)
  @MaxLength(2)
  @MinLength(2)
  @IsString()
  @Optional()
  language?: string | null;

  @Column(DataType.STRING)
  @IsString()
  @Optional()
  default_profile_type?: string | null;

  @Column(DataType.STRING)
  @Optional()
  @Type(() => TokenEnergyContract)
  @ValidateNested()
  energy_contract?: TokenEnergyContract | null;

  @Column(DataType.DATE)
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  last_updated!: Date; // TODO: we could try to use @UpdatedAt to avoid duplicated cols, last_updated and updatedAt

  public toTokenDTO(): TokenDTO {
    const dto = new TokenDTO();

    dto.country_code = this.country_code;
    dto.party_id = this.party_id;
    dto.uid = this.uid;
    dto.type = this.type;
    dto.contract_id = this.contract_id;
    dto.visual_number = this.visual_number;
    dto.issuer = this.issuer;
    dto.group_id = this.group_id;
    dto.valid = this.valid;
    dto.whitelist = this.whitelist;
    dto.language = this.language;
    dto.default_profile_type = this.default_profile_type;
    dto.energy_contract = this.energy_contract;
    dto.last_updated = this.last_updated;

    return dto;
  }
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
  type?: string;

  static build(
    country_code: string,
    party_id: string,
    uid: string,
    type?: string,
  ): SingleTokenRequest {
    const request = new SingleTokenRequest();
    request.country_code = country_code;
    request.party_id = party_id;
    request.uid = uid;
    // OCPI specifies: Token.type of the Token to retrieve. Default if omitted: RFID
    request.type = type ? type : TokenType.RFID;
    return request;
  }
}
