import {IsNotEmpty, IsString, IsUrl} from 'class-validator';
import {ModuleId} from './ModuleId';
import {InterfaceRole} from './InterfaceRole';
import {Enum} from '../util/decorators/enum';
import {
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {Version} from './Version';
import {VersionNumber} from './VersionNumber';

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

  @Column(DataType.STRING)
  @ForeignKey(() => Version)
  version!: string;

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
    dto.version = this.version;
    dto.identifier = this.identifier;
    dto.role = this.role;
    dto.url = this.url;
    return dto;
  }
}
