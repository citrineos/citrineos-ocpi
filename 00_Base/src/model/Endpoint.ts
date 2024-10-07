import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ModuleId } from './ModuleId';
import { InterfaceRole } from './InterfaceRole';
import { Enum } from '../util/decorators/Enum';
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from '@citrineos/data';
import { OcpiNamespace } from '../util/OcpiNamespace';
import { Exclude } from 'class-transformer';
import { ClientVersion } from './ClientVersion';
import { ServerVersion } from './ServerVersion';
import { VersionNumber } from './VersionNumber';
import { VersionEndpoint } from './VersionEndpoint';

export class EndpointDTO {
  @IsString()
  @IsNotEmpty()
  identifier!: ModuleId;

  @Enum(InterfaceRole, 'InterfaceRole')
  @IsNotEmpty()
  role!: InterfaceRole;

  @IsString()
  @IsUrl({ require_tld: false })
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
  @IsUrl({ require_tld: false })
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
    return Endpoint.build({
      identifier,
      role,
      url,
    });
  }

  static fromVersionEndpoint(versionEndpoint: VersionEndpoint): Endpoint {
    return Endpoint.buildEndpoint(
      versionEndpoint.identifier,
      versionEndpoint.role,
      versionEndpoint.url,
    );
  }

  static fromEndpointDTO(dto: EndpointDTO): Endpoint {
    return Endpoint.buildEndpoint(dto.identifier, dto.role, dto.url);
  }

  public toEndpointDTO(): EndpointDTO {
    const dto = new EndpointDTO();
    dto.identifier = this.identifier;
    dto.role = this.role;
    dto.url = this.url;
    return dto;
  }

  public isReceiverOf(module: ModuleId): boolean {
    return this.role === InterfaceRole.RECEIVER && this.identifier === module;
  }
}
