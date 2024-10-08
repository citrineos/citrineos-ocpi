import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import 'reflect-metadata';
import { RegistrationStatusEnumType } from '@citrineos/base';
import { Enum } from '../../util/decorators/Enum';
import { Optional } from '../../util/decorators/Optional';

export class ServerConfigModulesConfiguration {
  @IsInt()
  @IsPositive()
  heartbeatInterval: number;

  @IsInt()
  @IsPositive()
  bootRetryInterval: number;

  @IsNotEmpty()
  @IsEnum(RegistrationStatusEnumType)
  @Enum(RegistrationStatusEnumType, 'RegistrationStatusEnumType')
  unknownChargerStatus: RegistrationStatusEnumType;

  // Unknown chargers have no entry in BootConfig table
  @IsBoolean()
  @IsNotEmpty()
  getBaseReportOnPending: boolean;

  @IsBoolean()
  @IsNotEmpty()
  bootWithRejectedVariables: boolean;

  @IsBoolean()
  @IsNotEmpty()
  autoAccept: boolean;

  @IsString()
  endpointPrefix: string;

  @IsString()
  @Optional()
  host?: string;

  @IsInt()
  @IsPositive()
  @Optional()
  port?: number;

  constructor() {
    this.heartbeatInterval = 60;
    this.bootRetryInterval = 15;
    this.unknownChargerStatus = RegistrationStatusEnumType.Accepted;
    this.getBaseReportOnPending = true;
    this.bootWithRejectedVariables = true;
    this.autoAccept = true;
    this.endpointPrefix = '/configuration';
  }
}
