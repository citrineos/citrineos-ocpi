import {IsNotEmpty, IsString, IsUrl} from 'class-validator';
import {ModuleId} from './ModuleId';
import {InterfaceRole} from './InterfaceRole';
import {Enum} from '../util/decorators/enum';
import {BelongsTo, Column, DataType, ForeignKey, Model, Table,} from 'sequelize-typescript';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {Exclude} from "class-transformer";
import {ClientVersion} from "./client.version";
import {ServerVersion} from "./server.version";
import {VersionNumber} from "./VersionNumber";

export class EndpointDTO {
  @IsString()
  @IsNotEmpty()
  identifier!: ModuleId;

  @Enum(InterfaceRole, 'InterfaceRole')
  @IsNotEmpty()
  role!: InterfaceRole;

  @IsString()
  @IsUrl({require_tld: false})
  @IsNotEmpty()
  url!: string;

  @Enum(VersionNumber, 'VersionNumber')
  @IsNotEmpty()
  version!: string;
}

@Table
export class Endpoint extends Model {
  static readonly MODEL_NAME: string = OcpiNamespace.Endpoint;

  @Column(DataType.STRING)
  @IsString()
  @Enum(ModuleId, 'ModuleId')
  @IsNotEmpty()
  identifier!: ModuleId;

  @Column(DataType.STRING)
  @Enum(InterfaceRole, 'InterfaceRole')
  @IsNotEmpty()
  role!: InterfaceRole;

  @Column(DataType.STRING)
  @IsString()
  @IsUrl({require_tld: false})
  @IsNotEmpty()
  url!: string;

  @Exclude()
  @ForeignKey(() => ClientVersion)
  @Column(DataType.INTEGER)
  clientVersionId!: number;

  @Exclude()
  @BelongsTo(() => ClientVersion)
  clientVersion!: ClientVersion;

  @Exclude()
  @ForeignKey(() => ServerVersion)
  @Column(DataType.INTEGER)
  serverVersionId!: number;

  @Exclude()
  @BelongsTo(() => ServerVersion)
  serverVersion!: ServerVersion;

  static buildEndpoint(
    identifier: ModuleId,
    role: InterfaceRole,
    url: string,
  ): Endpoint {
    const endpoint = new Endpoint();
    endpoint.identifier = identifier;
    endpoint.role = role;
    endpoint.url = url;
    return endpoint;
  }

  public toEndpointDTO(): EndpointDTO {
    const dto = new EndpointDTO();
    dto.identifier = this.identifier;
    dto.role = this.role;
    dto.url = this.url;
    return dto;
  }
}
