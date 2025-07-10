import { IsNotEmpty, IsString } from 'class-validator';
import 'reflect-metadata';
import { Enum } from '../../util/decorators/Enum';
import { ServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion } from './ServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion';

export class ServerConfigUtilCertificateAuthorityV2gCAHubject {
  @IsString()
  @IsNotEmpty()
  baseUrl: string;

  @IsString()
  @IsNotEmpty()
  tokenUrl: string;

  @Enum(
    ServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion,
    'ServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion',
  )
  @IsNotEmpty()
  isoVersion: ServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion;

  constructor() {
    this.baseUrl = 'https://open.plugncharge-test.hubject.com';
    this.tokenUrl =
      'https://hubject.stoplight.io/api/v1/projects/cHJqOjk0NTg5/nodes/6bb8b3bc79c2e-authorization-token';
    this.isoVersion =
      ServerConfigUtilCertificateAuthorityV2gCAHubjectIsoVersion.ISO15118_2;
  }
}
