import {IsDateString, IsInt, Min} from 'class-validator';
import {Optional} from '../../util/decorators/optional';
import {DEFAULT_LIMIT, DEFAULT_OFFSET} from '../../model/PaginatedResponse';

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

  get date_from(): Date {
    return new Date(this._date_from!);
  }

  get date_to(): Date {
    return new Date(this._date_to!);
  }

  set date_from(value: Date) {
    this._date_from = value.toISOString();
  }

  set date_to(value: Date) {
    this._date_to = value.toISOString();
  }
}
