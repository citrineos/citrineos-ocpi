import { BaseClientApi, MissingRequiredParamException } from './BaseClientApi';
import { Cdr, CdrResponse, CdrResponseSchema } from '../model/Cdr';
import { Service } from 'typedi';
import {
  OcpiEmptyResponse,
  OcpiEmptyResponseSchema,
} from '../model/OcpiEmptyResponse';
import { ModuleId } from '../model/ModuleId';
import { EndpointIdentifier } from '../model/EndpointIdentifier';
import { HttpMethod, OCPIRegistration } from '@citrineos/base';
import { CommandResult } from '../model/CommandResult';

@Service()
export class CommandsClientApi extends BaseClientApi {
  CONTROLLER_PATH = ModuleId.Commands;

  getUrl(): string {
    throw new MissingRequiredParamException(`url must be provided by command`);
  }

  async postCommandResult(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    partnerProfile: OCPIRegistration.PartnerProfile,
    url: string, // Provided in the command
    body: CommandResult,
  ): Promise<OcpiEmptyResponse> {
    return this.request(
      fromCountryCode,
      fromPartyId,
      toCountryCode,
      toPartyId,
      HttpMethod.Post,
      OcpiEmptyResponseSchema,
      partnerProfile,
      true,
      url,
      body,
    );
  }
}
