import { OcpiHttpHeader } from '../ocpi.http.header';
import { OcpiHeaders } from '../../model/OcpiHeaders';
import { createParamDecorator } from 'routing-controllers';


export function FunctionalEndpointParams() {
  return createParamDecorator({
    required: true,
    value: (action: any) => {
      const fromCountryCode = action.request.headers[OcpiHttpHeader.OcpiFromCountryCode.toLocaleLowerCase()];
      const fromPartyId = action.request.headers[OcpiHttpHeader.OcpiFromPartyId.toLocaleLowerCase()];
      const toCountryCode = action.request.headers[OcpiHttpHeader.OcpiToCountryCode.toLocaleLowerCase()];
      const toPartyId = action.request.headers[OcpiHttpHeader.OcpiToPartyId.toLocaleLowerCase()];

      const headers = new OcpiHeaders(fromCountryCode, fromPartyId, toCountryCode, toPartyId);
      return headers;
    },
  });
}