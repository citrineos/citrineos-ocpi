import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { ServerConfigUtilCertificateAuthorityV2gCAHubject } from './ServerConfigUtilCertificateAuthorityV2gCAHubject';
import { Enum } from '../../util/decorators/Enum';
import { Optional } from '../../util/decorators/Optional';
import { ServerConfigUtilCertificateAuthorityV2gCAName } from './ServerConfigUtilCertificateAuthorityV2gCAName';

export class ServerConfigUtilCertificateAuthorityV2gCA {
  @Enum(
    ServerConfigUtilCertificateAuthorityV2gCAName,
    'ServerConfigUtilCertificateAuthorityV2gCAName',
  )
  @IsNotEmpty()
  name: ServerConfigUtilCertificateAuthorityV2gCAName;

  @Optional()
  @Type(() => ServerConfigUtilCertificateAuthorityV2gCAHubject)
  @ValidateNested()
  hubject?: ServerConfigUtilCertificateAuthorityV2gCAHubject;

  constructor() {
    this.name = ServerConfigUtilCertificateAuthorityV2gCAName.HUBJECT;
    this.hubject = new ServerConfigUtilCertificateAuthorityV2gCAHubject();
  }
}
