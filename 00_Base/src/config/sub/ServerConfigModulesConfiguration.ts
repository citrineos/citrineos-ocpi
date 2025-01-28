import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
} from 'class-validator';
import 'reflect-metadata';
import { OCPP2_0_1 } from '@citrineos/base';
import { Enum } from '../../util/decorators/enum';
import { Optional } from '../../util/decorators/optional';

export class ServerConfigModulesConfiguration {
  @IsInt()
  @IsPositive()
  heartbeatInterval: number;

  @IsInt()
  @IsPositive()
  bootRetryInterval: number;

  @IsNotEmpty()
  @IsEnum(OCPP2_0_1.RegistrationStatusEnumType)
  @Enum(OCPP2_0_1.RegistrationStatusEnumType, 'RegistrationStatusEnumType')
  unknownChargerStatus: OCPP2_0_1.RegistrationStatusEnumType;

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
    this.unknownChargerStatus = OCPP2_0_1.RegistrationStatusEnumType.Accepted;
    this.getBaseReportOnPending = true;
    this.bootWithRejectedVariables = true;
    this.autoAccept = true;
    this.endpointPrefix = '/configuration';
  }
}
