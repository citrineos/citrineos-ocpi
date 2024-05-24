import {IsDate, IsNotEmpty, IsString, ValidateNested} from 'class-validator';
import {Optional} from '../util/decorators/optional';
import {Enum} from '../util/decorators/enum';

export enum OcpiResponseStatusCode {
  GenericSuccessCode = 1000,
  ClientGenericError = 2000,
  ClientInvalidOrMissingParameters = 2001,
  ClientNotEnoughInformation = 2002,
  ClientUnknownLocation = 2003,
  ClientUnknownToken = 2004,
  ServerGenericError = 3000,
  ServerUnableToUseClientApi = 3001,
  ServerUnsupportedVersion = 3002,
  ServerNoMatchingEndpoints = 3003,
  HubGenericError = 4000,
  HubUnknownReceiver = 4001,
  HubTimeoutOnForwardedMessage = 4002,
  HubConnectionProblem = 4003
}

export class OcpiResponse<T> {
  @Enum(OcpiResponseStatusCode, 'OcpiResponseStatusCode')
  @IsNotEmpty()
  status_code!: OcpiResponseStatusCode;
  /**
   *
   * @type {string}
   * @memberof OcpiResponseDTO
   */
  @IsString()
  @Optional()
  status_message?: string;

  /**
   *
   * @type {string}
   * @memberof OcpiResponseDTO
   */
  @IsDate()
  timestamp!: Date;

  /**
   *
   * @type {object}
   * @memberof OcpiResponseDTO
   */
  @Optional()
  data?: T;
}

export const buildOcpiResponse = <T>(
  status_code: OcpiResponseStatusCode,
  data?: T,
  status_message?: string,
) => {
  const response = new OcpiResponse<T>();
  response.status_code = status_code;
  response.status_message = status_message;
  response.data = data;
  response.timestamp = new Date();
  return response;
};
