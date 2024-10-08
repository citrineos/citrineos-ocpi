import { OcpiResponse, OcpiResponseStatusCode } from '../model/OcpiResponse';
import { NotFoundException } from '../exception/NotFoundException';

export function buildGenericSuccessResponse<T>(
  data?: T,
  message?: string,
): OcpiResponse<T> {
  const response: OcpiResponse<T> = new OcpiResponse<T>();
  response.status_code = OcpiResponseStatusCode.GenericSuccessCode;
  response.status_message = message || 'Success';
  response.data = data;
  return response;
}

export function buildGenericServerErrorResponse<T>(
  data?: T,
  error?: Error,
): OcpiResponse<T> {
  const response: OcpiResponse<T> = new OcpiResponse<T>();
  response.status_code = OcpiResponseStatusCode.ServerGenericError;
  response.status_message = error?.message;
  response.data = data;
  return response;
}

export function buildGenericClientErrorResponse<T>(
  data?: T,
  error?: Error,
): OcpiResponse<T> {
  const response: OcpiResponse<T> = new OcpiResponse<T>();
  response.status_code = OcpiResponseStatusCode.ClientGenericError;
  response.status_message = error?.message;
  response.data = data;
  return response;
}

export function buildUnknownLocationResponse<T>(
  data?: T,
  error?: NotFoundException,
): OcpiResponse<T> {
  const response: OcpiResponse<T> = buildGenericServerErrorResponse(
    data,
    error,
  );
  response.status_code = OcpiResponseStatusCode.ClientUnknownLocation;
  return response;
}

export function buildUnknownSessionResponse<T>(
  data: T,
  error: NotFoundException,
): OcpiResponse<T> {
  return buildGenericClientErrorResponse(data, error);
}
