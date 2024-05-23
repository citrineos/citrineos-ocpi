import {HTTPHeaders} from './BaseApi';
import {OcpiParams} from './util/ocpi.params';
import {OcpiHttpHeader} from '../util/ocpi.http.header';

export const setAuthHeader = (headerParameters: HTTPHeaders) => {
  const tokenString = 'todo'; // todo get token from credentials
  headerParameters['Authorization'] = `Bearer ${tokenString}`;
};

export const getOcpiHeaders = (
  params: OcpiParams,
): HTTPHeaders => {

  const headerParameters: HTTPHeaders = {};

  if (params.xRequestId != null) {
    headerParameters[OcpiHttpHeader.XRequestId] = String(params.xRequestId);
  }

  if (params.xCorrelationId != null) {
    headerParameters[OcpiHttpHeader.XCorrelationId] = String(params.xCorrelationId);
  }

  if (params.fromCountryCode != null) {
    headerParameters[OcpiHttpHeader.OcpiFromCountryCode] = String(params.fromCountryCode);
  }

  if (params.fromPartyId != null) {
    headerParameters[OcpiHttpHeader.OcpiFromPartyId] = String(params.fromPartyId);
  }

  if (params.toCountryCode != null) {
    headerParameters[OcpiHttpHeader.OcpiToCountryCode] = String(params.toCountryCode);
  }

  if (params.toPartyId != null) {
    headerParameters[OcpiHttpHeader.OcpiToPartyId] = String(params.toPartyId);
  }

  return headerParameters;
};
