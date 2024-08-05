import { IsNotEmpty, IsString } from 'class-validator';
import 'reflect-metadata';
import { Enum } from '../../util/decorators/enum';
import { Env } from './Env';

export class ServerConfigUtilCertificateAuthorityChargingStationCAAcme {
  @IsNotEmpty()
  @Enum(Env, 'Env')
  env!: Env;

  @IsString()
  @IsNotEmpty()
  accountKeyFilePath!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;
}
