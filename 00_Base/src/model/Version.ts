import { VersionNumber } from './VersionNumber';
import { Endpoint } from './Endpoint';
import { ClientInformation } from './ClientInformation';
import { VersionDTO } from './DTO/VersionDTO';
import { VersionDetailsDTO } from './DTO/VersionDetailsDTO';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { Enum } from '../util/decorators/Enum';

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

export class Version {
  @IsNotEmpty()
  @Enum(VersionNumber, 'VersionNumber')
  version!: VersionNumber;

  @IsString()
  @IsUrl({ require_tld: false })
  url!: string;

  endpoints!: Endpoint[];

  static buildVersion(
    version: VersionNumber,
    url: string,
    endpoints: Endpoint[],

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
    dto.endpoints = this.endpoints;
    return dto;
  }
}
