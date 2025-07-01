import { IsNotEmpty, IsString } from 'class-validator';
import 'reflect-metadata';
import { Enum } from '../../util/decorators/Enum';
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
