import { IsInt, IsPositive, IsString } from 'class-validator';
import { Optional } from '../../util/decorators/Optional';

export class EndpointPrefixHostPort {
  @IsString()
  endpointPrefix: string;

  @IsString()
  @Optional()
  host?: string = '0.0.0.0';

  @IsInt()
  @Optional()
  @IsPositive()
  port?: number = 8080;

  constructor(endpointPrefix: string) {
    this.endpointPrefix = endpointPrefix;
  }
}
