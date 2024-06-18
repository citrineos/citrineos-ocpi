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
import {TokenEnergyContract} from './TokenEnergyContract';
import {WhitelistType} from './WhitelistType';
import {Type} from 'class-transformer';
import {Optional} from '../util/decorators/optional';
import {Enum} from '../util/decorators/enum';
import {OcpiResponse} from './ocpi.response';
import {PaginatedResponse} from './PaginatedResponse';
import {Column, DataType, Model, Table} from "sequelize-typescript";
import {OcpiNamespace} from "../util/ocpi.namespace";

@Table
export class Token extends Model {

    static readonly MODEL_NAME: string = OcpiNamespace.Tokens;

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
    @MaxLength(36)
    @IsString()
    @IsNotEmpty()
    uid!: string;

    @Column(DataType.STRING)
    @IsString()
    @IsNotEmpty()
    type!: string;

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

    @Column(DataType.STRING)
    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    last_updated!: Date;
}

export class TokenResponse extends OcpiResponse<Token> {
    @IsObject()
    @IsNotEmpty()
    @Type(() => Token)
    @ValidateNested()
    data!: Token;
}

export class PaginatedTokenResponse extends PaginatedResponse<Token> {
    @IsArray()
    @ValidateNested({each: true})
    @IsNotEmpty()
    @Optional(false)
    @Type(() => Token)
    data!: Token[];
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
    type!: string;
}
