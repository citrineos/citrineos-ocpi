import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { ServerConfigUtilCertificateAuthorityChargingStationCAAcme } from './ServerConfigUtilCertificateAuthorityChargingStationCAAcme';
import { Optional } from '../../util/decorators/optional';
import { Enum } from '../../util/decorators/enum';
import { ServerConfigUtilCertificateAuthorityV2gCAName } from './ServerConfigUtilCertificateAuthorityV2gCAName';
import { ServerConfigUtilCertificateAuthorityChargingStationCAName } from './ServerConfigUtilCertificateAuthorityChargingStationCAName';

export class ServerConfigUtilCertificateAuthorityChargingStationCA {
  @Enum(
    ServerConfigUtilCertificateAuthorityV2gCAName,
    'ServerConfigUtilCertificateAuthorityV2gCAName',
  )
  @IsNotEmpty()
  name = ServerConfigUtilCertificateAuthorityChargingStationCAName.ACME;

  @Optional()
  @Type(() => ServerConfigUtilCertificateAuthorityChargingStationCAAcme)
  @ValidateNested()
  acme?: ServerConfigUtilCertificateAuthorityChargingStationCAAcme;

  constructor() {
    this.name = ServerConfigUtilCertificateAuthorityChargingStationCAName.ACME;
    this.acme = new ServerConfigUtilCertificateAuthorityChargingStationCAAcme();
  }
}
