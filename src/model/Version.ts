import {VersionNumber} from './VersionNumber';
import {Endpoint} from './Endpoint';
import {ClientInformation} from "./client.information";
import {VersionDTO} from "./VersionDTO";
import {VersionDetailsDTO} from "./VersionDetailsDTO";
import {Column, DataType, HasMany, Model, Table} from "sequelize-typescript";
import {IsNotEmpty, IsString, IsUrl} from "class-validator";
import {Enum} from "../util/decorators/enum";
import {VersionEndpoint} from "./VersionEndpoint";
import {ON_DELETE_CASCADE} from "../util/sequelize";

export interface IVersion {
  id?: number;
  version: VersionNumber;
  url: string;
  endpoints: Endpoint[];
  clientInformationId: number;
  clientInformation: ClientInformation;
  toVersionDTO: () => VersionDTO;
  toVersionDetailsDTO: () => VersionDetailsDTO;
}

@Table
export class Version extends Model {
  @Column(DataType.ENUM(...Object.values(VersionNumber)))
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @Column(DataType.STRING)
  @IsString()
  @IsUrl({require_tld: false})
  url!: string;

  @HasMany(() => VersionEndpoint, {
    onDelete: ON_DELETE_CASCADE,
  })
  endpoints!: VersionEndpoint[];

  static buildVersion(
    version: VersionNumber,
    url: string,
    endpoints: VersionEndpoint[],
  ): Version {
    const v = new Version();
    v.version = version;
    v.url = url;
    v.endpoints = endpoints;
    return v;
  }

  public toVersionDTO(): VersionDTO {
    const dto = new VersionDTO();
    dto.version = this.version;
    dto.url = this.url;
    return dto;
  }

  public toVersionDetailsDTO(): VersionDetailsDTO {
    const dto = new VersionDetailsDTO();
    dto.version = this.version;
    dto.endpoints = this.endpoints.map((endpoint) => endpoint.toEndpointDTO());
    return dto;
  }
}
