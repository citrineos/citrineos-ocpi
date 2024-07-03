import { OcpiResponse, OcpiResponseStatusCode } from './ocpi.response';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { Exclude } from 'class-transformer';

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
  @Min(0)
  @Max(200) // todo should this setting be in a config??
  @Exclude()
  limit?: number = DEFAULT_LIMIT;
}

export const buildOcpiPaginatedResponse = <T>(
  status_code: OcpiResponseStatusCode,
  total: number,
  limit: number,
  offset: number,
  data?: T[],
  status_message?: string,
) => {
  const response = new PaginatedResponse<T>();
  response.total = total;
  response.limit = limit;
  response.offset = offset;
  response.status_code = status_code;
  response.status_message = status_message;
  response.data = data;
  response.timestamp = new Date();
  return response;
};
