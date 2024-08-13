import { IsNotEmpty, Validate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { ServerConfigUtilCertificateAuthorityV2gCA } from './ServerConfigUtilCertificateAuthorityV2gCA';
import { ServerConfigUtilCertificateAuthorityChargingStationCA } from './ServerConfigUtilCertificateAuthorityChargingStationCA';
import { ServerConfigUtilCertificateAuthorityChargingStationCAName } from './ServerConfigUtilCertificateAuthorityChargingStationCAName';

export class ServerConfigUtilCertificateAuthority {
  @IsNotEmpty()
  @Type(() => ServerConfigUtilCertificateAuthorityV2gCA)
  @ValidateNested()
  v2gCA: ServerConfigUtilCertificateAuthorityV2gCA;

  @IsNotEmpty()
  @Type(() => ServerConfigUtilCertificateAuthorityChargingStationCA)
  @ValidateNested()
  @Validate((obj: ServerConfigUtilCertificateAuthorityChargingStationCA) => {
    if (
      obj.name ===
      ServerConfigUtilCertificateAuthorityChargingStationCAName.ACME
    ) {
      return obj.acme;
    } else {
      return false;
    }
  })
  chargingStationCA: ServerConfigUtilCertificateAuthorityChargingStationCA;

  constructor() {
    this.v2gCA = new ServerConfigUtilCertificateAuthorityV2gCA();
    this.chargingStationCA =
      new ServerConfigUtilCertificateAuthorityChargingStationCA();
  }
}
