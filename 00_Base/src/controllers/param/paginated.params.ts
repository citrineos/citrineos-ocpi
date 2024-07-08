import { IsDate, IsInt, Min } from 'class-validator';
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

  @IsDate()
  @Optional()
  private _date_from?: Date;

  @IsDate()
  @Optional()
  private _date_to?: Date;

  get date_from(): Date | undefined {
    return this._date_from ? new Date(this._date_from) : undefined;
  }

  get date_to(): Date | undefined {
    return this._date_to ? new Date(this._date_to) : undefined;
  }

  set date_from(value: string | Date | undefined) {
    this._date_from = value ? new Date(value) : undefined;
  }

  set date_to(value: string | Date | undefined) {
    this._date_to = value ? new Date(value) : undefined;
  }
}
