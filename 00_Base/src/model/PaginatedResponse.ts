import { OcpiResponse, OcpiResponseStatusCode } from './OcpiResponse';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export const DEFAULT_LIMIT = 10;
export const DEFAULT_OFFSET = 0;

export class PaginatedResponse<T> extends OcpiResponse<T[]> {
  @IsInt()
  @IsNotEmpty()
  total?: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  offset?: number = DEFAULT_OFFSET;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Max(200) // todo should this setting be in a config??
  limit?: number = DEFAULT_LIMIT;

  @IsString()
  @IsNotEmpty()
  link?: string;
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
