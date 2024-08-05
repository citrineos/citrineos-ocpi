import { IsBoolean, IsInt, IsPositive } from 'class-validator';
import { Service } from 'typedi';
import 'reflect-metadata';
import { EndpointPrefixHostPort } from './EndpointPrefixHostPort';
import { Optional } from '../../util/decorators/optional';

@Service()
export class ServerConfigModulesTransactions extends EndpointPrefixHostPort {
  @IsInt()
  @IsPositive()
  @Optional()
  costUpdatedInterval?: number;

  @IsBoolean()
  @Optional()
  sendCostUpdatedOnMeterValue?: boolean;

  constructor() {
    super('/transactions');
    this.costUpdatedInterval = 60;
  }
}
