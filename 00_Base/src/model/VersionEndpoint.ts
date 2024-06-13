import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { Enum } from '../util/decorators/enum';
import { ModuleId } from './ModuleId';
import { InterfaceRole } from './InterfaceRole';
import { Exclude } from 'class-transformer';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Endpoint, EndpointDTO } from './Endpoint';
import { Version } from './Version';

@Table
export class VersionEndpoint extends Model {
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
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url!: string;

  @Exclude()
  @ForeignKey(() => Version)
  @Column(DataType.INTEGER)
  versionId!: number;

  @Exclude()
  @BelongsTo(() => Version)
  version!: Version;

  static buildVersionEndpoint(
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
