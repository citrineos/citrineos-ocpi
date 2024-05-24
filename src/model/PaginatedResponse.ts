import {OcpiResponse} from './ocpi.response';
import {IsInt, IsNotEmpty, IsPositive, Max, Min} from 'class-validator';
import {Exclude} from 'class-transformer';

export const DEFAULT_LIMIT = 10;
export const DEFAULT_OFFSET = 0;

export class PaginatedResponse<T> extends OcpiResponse<T[]> {
  @IsInt()
  @IsNotEmpty()
  @Exclude()
  total?: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Exclude()
  offset?: number = DEFAULT_OFFSET;

  @IsInt()
  @IsNotEmpty()
  @IsPositive()
  @Max(200) // todo should this setting be in a config??
  @Exclude()
  limit?: number = DEFAULT_LIMIT;
}
