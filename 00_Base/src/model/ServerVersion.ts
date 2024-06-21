import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { VersionNumber } from './VersionNumber';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { Enum } from '../util/decorators/enum';
import { Exclude } from 'class-transformer';
import { Endpoint } from './Endpoint';
import { ClientInformation } from './ClientInformation';
import { VersionDTO } from './DTO/VersionDTO';
import { VersionDetailsDTO } from './DTO/VersionDetailsDTO';
import { IVersion, Version } from './Version';
import { ON_DELETE_CASCADE } from '../util/sequelize';

@Table
export class ServerVersion extends Model implements IVersion {
  @Column(DataType.ENUM(...Object.values(VersionNumber)))
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @Column(DataType.STRING)
  @IsString()
  @IsUrl({ require_tld: false })
  url!: string;

  @Exclude()
  @HasMany(() => Endpoint, {
    onDelete: ON_DELETE_CASCADE,
  })
  endpoints!: Endpoint[];

  @Exclude()
  @ForeignKey(() => ClientInformation)
  @Column(DataType.INTEGER)
  clientInformationId!: number;

  @Exclude()
  @BelongsTo(() => ClientInformation)
  clientInformation!: ClientInformation;

  static buildServerVersion(
    version: VersionNumber,
    url: string,
    endpoints: Endpoint[],
  ): ServerVersion {
    return ServerVersion.build({
      version,
      url,
      endpoints,
    });
  }

  static fromVersion(version: Version): ServerVersion {
    return ServerVersion.buildServerVersion(
      version.version,
      version.url,
      version.endpoints.map((endpoint) =>
        Endpoint.fromVersionEndpoint(endpoint),
      ),
    );
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
