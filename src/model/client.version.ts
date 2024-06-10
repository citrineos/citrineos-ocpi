import {BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table} from "sequelize-typescript";
import {VersionNumber} from "./VersionNumber";
import {IsNotEmpty, IsString, IsUrl} from "class-validator";
import {Enum} from "../util/decorators/enum";
import {Exclude} from "class-transformer";
import {Endpoint} from "./Endpoint";
import {ClientInformation} from "./client.information";
import {VersionDTO} from "./VersionDTO";
import {VersionDetailsDTO} from "./VersionDetailsDTO";
import {IVersion} from "./Version";

@Table
export class ClientVersion extends Model implements IVersion {
  @Column(DataType.ENUM(...Object.values(VersionNumber)))
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @Column(DataType.STRING)
  @IsString()
  @IsUrl()
  url!: string;

  @Exclude()
  @HasMany(() => Endpoint)
  endpoints!: Endpoint[];

  @Exclude()
  @ForeignKey(() => ClientInformation)
  @Column(DataType.INTEGER)
  clientInformationId!: number;

  @Exclude()
  @BelongsTo(() => ClientInformation)
  clientInformation!: ClientInformation;

  static buildClientVersion(
    version: VersionNumber,
    url: string,
    endpoints: Endpoint[],
  ): ClientVersion {
    const v = new ClientVersion();
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
