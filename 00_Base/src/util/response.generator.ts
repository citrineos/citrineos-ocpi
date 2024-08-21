import { OcpiResponse, OcpiResponseStatusCode } from '../model/ocpi.response';

export class ResponseGenerator {
  static buildGenericSuccessResponse<T>(
    data?: T,
    message?: string,
  ): OcpiResponse<T> {
    const response: OcpiResponse<T> = new OcpiResponse<T>();
    response.status_code = OcpiResponseStatusCode.GenericSuccessCode;
    response.status_message = message ?? 'Success';
    response.data = data;
    response.timestamp = new Date();
    return response;
  }

  static buildGenericServerErrorResponse<T>(
    data?: T,
    message?: string,
    error?: Error,
  ): OcpiResponse<T> {
    const response: OcpiResponse<T> = new OcpiResponse<T>();
    response.status_code = OcpiResponseStatusCode.ServerGenericError;
    response.status_message = message ?? error?.message;
    response.data = data;
    response.timestamp = new Date();
    return response;
  }

  static buildGenericClientErrorResponse<T>(
    data?: T,
    message?: string,
    error?: Error,
  ): OcpiResponse<T> {
    const response: OcpiResponse<T> = new OcpiResponse<T>();
    response.status_code = OcpiResponseStatusCode.ClientGenericError;
    response.status_message = message ?? error?.message;
    response.data = data;
    response.timestamp = new Date();
    return response;
  }

  static buildUnknownLocationResponse<T>(
    data?: T,
    message?: string,
    error?: Error,
  ): OcpiResponse<T> {
    const response: OcpiResponse<T> = this.buildGenericServerErrorResponse(
      data,
      message,
      error,
    );
    response.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
    return response;
  }

  static buildInvalidOrMissingParametersResponse<T>(
    data?: T,
    message?: string,
    error?: Error,
  ): OcpiResponse<T> {
    const response: OcpiResponse<T> = new OcpiResponse<T>();
    response.status_code =
      OcpiResponseStatusCode.ClientInvalidOrMissingParameters;
    response.status_message = message ?? error?.message;
    response.data = data;
    response.timestamp = new Date();
    return response;
  }
}
