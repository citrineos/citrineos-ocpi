import { IsDateString, IsInt, Min } from 'class-validator';
import { Optional } from '../../util/decorators/optional';
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from '../../model/PaginatedResponse';

export class PaginatedParams {
  @IsInt()
  @Min(0)
  @Optional()
  offset?: number = DEFAULT_OFFSET;

  @IsInt()
  @Min(1)
  @Optional()
  limit?: number = DEFAULT_LIMIT;

  @IsDateString()
  @Optional()
  private _date_from?: string;

  @IsDateString()
  @Optional()
  private _date_to?: string;

  get date_from(): Date | undefined {
    return this._date_from ? new Date(this._date_from!) : undefined;
  }

  get date_to(): Date | undefined {
    return this._date_to ? new Date(this._date_to!) : undefined;
  }

  set date_from(value: string) {
    this._date_from = value;
  }

  set date_to(value: string) {
    this._date_to = value;
  }
}
