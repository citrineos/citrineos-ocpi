import { VersionNumber } from './VersionNumber';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { Enum } from '../util/decorators/Enum';
import { Exclude } from 'class-transformer';
import { Endpoint } from './Endpoint';
import { ClientInformation } from './ClientInformation';
import { VersionDTO } from './DTO/VersionDTO';
import { VersionDetailsDTO } from './DTO/VersionDetailsDTO';
import { IVersion } from './Version';

export class ClientVersion implements IVersion {
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @IsString()
  @IsUrl({ require_tld: false })
  url!: string;

  @Exclude()
  endpoints!: Endpoint[];

  @Exclude()
  clientInformationId!: number;

  @Exclude()
  clientInformation!: ClientInformation;

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
