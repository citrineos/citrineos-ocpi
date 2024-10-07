import { IsInt, IsPositive, IsString } from 'class-validator';
import { Optional } from '../../util/decorators/Optional';

export class EndpointPrefixHostPort {
  @IsString()
  endpointPrefix: string;

  @IsString()
  @Optional()
  host?: string;

  @IsInt()
  @Optional()
  @IsPositive()
  port?: number;

  constructor(endpointPrefix: string) {
    this.endpointPrefix = endpointPrefix;
  }
}
