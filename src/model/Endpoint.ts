import {IsNotEmpty, IsString, IsUrl} from 'class-validator';
import {ModuleId} from './ModuleId';
import {InterfaceRole} from './InterfaceRole';
import {Enum} from '../util/decorators/enum';
import {BelongsTo, Column, DataType, ForeignKey, Model, Table,} from 'sequelize-typescript';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {Version} from './Version';
import {Exclude} from "class-transformer";

export class EndpointDTO {
  @IsString()
  @IsNotEmpty()
  identifier!: ModuleId;

  @Enum(InterfaceRole, 'InterfaceRole')
  @IsNotEmpty()
  role!: InterfaceRole;

  @IsString()
  @IsUrl()
  @IsNotEmpty()
  url!: string;

  version!: string;
}

@Table
export class Endpoint extends Model {
  static readonly MODEL_NAME: string = OcpiNamespace.Endpoint;

  @Exclude()
  @ForeignKey(() => Version)
  @Column(DataType.INTEGER)
  versionId!: number;

  @Exclude()
  @BelongsTo(() => Version)
  version!: Version;

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
  @IsUrl()
  @IsNotEmpty()
  url!: string;

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
