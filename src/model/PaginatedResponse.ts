import {OcpiResponse} from "./ocpi.response";
import {IsInt, IsNotEmpty, IsPositive} from "class-validator";
import {Exclude} from "class-transformer";

export const DEFAULT_LIMIT = 10;
export const DEFAULT_OFFSET = 0;

export class PaginatedResponse<T> extends OcpiResponse<T[]> {
  @IsInt()
  @IsNotEmpty()
  @Exclude()
  total?: number;

  @IsInt()
  @IsNotEmpty()
  @IsPositive()
  @Exclude()
  offset?: number = DEFAULT_OFFSET;

  @IsInt()
  @IsNotEmpty()
  @IsPositive()
  @Exclude()
  limit?: number = DEFAULT_LIMIT;
}
