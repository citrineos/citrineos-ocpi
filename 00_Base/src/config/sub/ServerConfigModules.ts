import {
  IsNotEmpty,
  Validate,
  ValidateNested,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { ServerConfigModulesCertificates } from './ServerConfigModulesCertificates';
import { ServerConfigUtilCache } from './ServerConfigUtilCache';
import { ServerConfigModulesEVDriver } from './ServerConfigModulesEVDriver';
import { ServerConfigModulesConfiguration } from './ServerConfigModulesConfiguration';
import { ServerConfigModulesMonitoring } from './ServerConfigModulesMonitoring';
import { ServerConfigModulesReporting } from './ServerConfigModulesReporting';
import { ServerConfigModulesSmartCharging } from './ServerConfigModulesSmartCharging';
import { ServerConfigModulesTenant } from './ServerConfigModulesTenant';
import { ServerConfigModulesTransactions } from './ServerConfigModulesTransactions';
import { Optional } from '../../util/decorators/Optional';

export class ServerConfigModules {
  @Optional()
  @Type(() => ServerConfigModulesCertificates)
  @ValidateNested()
  certificates!: ServerConfigModulesCertificates;

  @IsNotEmpty()
  @Type(() => ServerConfigUtilCache)
  @ValidateNested()
  evdriver!: ServerConfigModulesEVDriver;

  @IsNotEmpty()
  @Type(() => ServerConfigModulesConfiguration)
  @ValidateNested()
  configuration!: ServerConfigModulesConfiguration;

  @IsNotEmpty()
  @Type(() => ServerConfigModulesMonitoring)
  @ValidateNested()
  monitoring!: ServerConfigModulesMonitoring;

  @IsNotEmpty()
  @Type(() => ServerConfigModulesReporting)
  @ValidateNested()
  reporting!: ServerConfigModulesReporting;

  @Optional()
  @Type(() => ServerConfigModulesSmartCharging)
  @ValidateNested()
  smartcharging!: ServerConfigModulesSmartCharging;

  @IsNotEmpty()
  @Type(() => ServerConfigModulesTenant)
  @ValidateNested()
  tenant!: ServerConfigModulesTenant;

  @IsNotEmpty()
  @Type(() => ServerConfigModulesTransactions)
  @ValidateNested()
  @Validate(
    (obj: ServerConfigModulesTransactions, _args: ValidationArguments) =>
      (!(obj.costUpdatedInterval && obj.sendCostUpdatedOnMeterValue) &&
        (obj.costUpdatedInterval ||
          obj.sendCostUpdatedOnMeterValue)) as boolean,
    {
      message:
        'Can only update cost based on the interval or in response to a transaction event /meter value' +
        ' update. Not allowed to have both costUpdatedInterval and sendCostUpdatedOnMeterValue configured',
    },
  )
  transactions!: ServerConfigModulesTransactions;
}
