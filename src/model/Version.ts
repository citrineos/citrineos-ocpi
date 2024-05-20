import {VersionNumber} from './VersionNumber';
import {ArrayMinSize, IsArray, IsNotEmpty, IsObject, IsString, IsUrl, ValidateNested,} from 'class-validator';
import {Column, DataType, Model, PrimaryKey, Table,} from 'sequelize-typescript';
import {Endpoint} from './Endpoint';
import {Enum} from '../util/decorators/enum';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {OcpiResponse} from "../util/ocpi.response";
import {Type} from "class-transformer";

export class VersionDTO {
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @IsString()
  @IsUrl()
  url!: string;
}

export class VersionDTOListResponse extends OcpiResponse<VersionDTO[]> {
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => VersionDTO)
  data!: VersionDTO[];
}

export class VersionDetailsDTO {
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @ArrayMinSize(1)
  @IsArray()
  @IsNotEmpty()
  endpoints!: Endpoint[];
}

export class VersionDetailsDTOResponse extends OcpiResponse<VersionDetailsDTO> {
  @IsObject()
  @IsNotEmpty()
  @Type(() => VersionDetailsDTO)
  @ValidateNested()
  data!: VersionDetailsDTO;
}

@Table
export class Version extends Model {
  static readonly MODEL_NAME: string = OcpiNamespace.Version;

  @PrimaryKey
  @Column({
    type: DataType.STRING,
    unique: 'version_number_type',
  })
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @Column(DataType.STRING)
  @IsString()
  @IsUrl()
  url!: string;

  @ArrayMinSize(1)
  @IsArray()
  @IsNotEmpty()
  endpoints!: Endpoint[];

  public toVersionDTO(): VersionDTO {
    const dto = new VersionDTO();
    dto.version = this.version;
    dto.url = this.url;
    return dto;
  }

  public toVersionDetailsDTO(): VersionDetailsDTO {
    const dto = new VersionDetailsDTO();
    dto.version = this.version;
    dto.endpoints = this.endpoints;
    return dto;
  }
}
