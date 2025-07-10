import {
  IsDateString,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Optional } from '../util/decorators/Optional';
import { OcpiResponse, OcpiResponseStatusCode } from './OcpiResponse';

export class OcpiEmptyResponse extends OcpiResponse<void> {
  @Optional()
  @ValidateNested() // needed for json schema
  data?: undefined;

  @IsString()
  @Optional()
  status_message?: string;

  @IsString()
  @IsDateString()
  @IsNotEmpty()
  timestamp!: Date;

  status_code = OcpiResponseStatusCode.GenericSuccessCode;

  static build(status_code: OcpiResponseStatusCode): OcpiEmptyResponse {
    const response = new OcpiEmptyResponse();
    response.status_code = status_code;
    response.timestamp = new Date();
    return response;
  }
}
