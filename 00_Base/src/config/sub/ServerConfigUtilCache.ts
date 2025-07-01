import { IsBoolean, IsNotEmpty, ValidateNested } from 'class-validator';
import { Service } from 'typedi';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { ServerConfigHostPort } from './ServerConfigHostPort';
import { Optional } from '../../util/decorators/Optional';

@Service()
export class ServerConfigUtilCache {
  @IsBoolean()
  @Optional()
  memory?: boolean;

  @IsNotEmpty()
  @Type(() => ServerConfigHostPort)
  @ValidateNested()
  redis?: ServerConfigHostPort;

  constructor() {
    this.memory = true;
  }
}
