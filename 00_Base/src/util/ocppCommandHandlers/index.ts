import {
  IChargingStationDto,
  IMessageConfirmation,
  ITenantPartnerDto,
  OCPPVersion,
} from '@citrineos/base';
import {
  CommandResultType,
  CommandType,
  ModuleId,
  OcpiConfig,
  OcpiConfigToken,
  StartSession,
  StopSession,
} from '../..';
import { IRequestOptions, RestClient } from 'typed-rest-client';
import { Logger, ILogObj } from 'tslog';
import { Inject, Token } from 'typedi';
import { OcpiGraphqlClient } from '../../graphql/OcpiGraphqlClient';
import { CommandsClientApi } from '../../trigger/CommandsClientApi';
import Ajv from 'ajv';

export const OCPP_COMMAND_HANDLER = new Token<OCPPCommandHandler>(
  'OCPP_COMMAND_HANDLER',
);

export abstract class OCPPCommandHandler {
  abstract readonly supportedVersion: OCPPVersion;

  @Inject()
  private ajv!: Ajv;

  @Inject()
  protected logger!: Logger<ILogObj>;

  @Inject()
  protected ocpiGraphqlClient!: OcpiGraphqlClient;

  @Inject()
  protected commandsClientApi!: CommandsClientApi;

  @Inject(OcpiConfigToken)
  protected config!: OcpiConfig;

  private restClient!: RestClient;

  constructor() {
    this.restClient = new RestClient(`CitrineOS OCPI ${ModuleId.Commands}`);
  }

  abstract sendStartSessionCommand(
    startSession: StartSession,
    tenantPartner: ITenantPartnerDto,
    chargingStation: IChargingStationDto,
    commandId: string,
  ): Promise<void>;

  abstract sendStopSessionCommand(
    stopSession: StopSession,
    tenantPartner: ITenantPartnerDto,
    chargingStation: IChargingStationDto,
    commandId: string,
  ): Promise<void>;

  abstract handleAsyncCommandResponse(
    tenantPartner: ITenantPartnerDto,
    command: CommandType,
    responseUrl: string,
    response: any,
    commandId: string,
  ): Promise<void>;

  protected async sendOCPPMessage(
    url: string,
    payload: any,
    options: IRequestOptions,
    tenantPartner: ITenantPartnerDto,
    responseUrl: string,
    commandId: string,
  ): Promise<void> {
    const messageConfirmation = await this.restClient.create<
      IMessageConfirmation[]
    >(url, payload, options);
    if (
      messageConfirmation.statusCode !== 200 ||
      !messageConfirmation.result?.[0].success
    ) {
      this.logger.warn('Failed to send OCPP request', {
        url,
        statusCode: messageConfirmation.statusCode,
        response: messageConfirmation.result,
      });
      await this.commandsClientApi.postCommandResult(
        tenantPartner.countryCode!,
        tenantPartner.partyId!,
        tenantPartner.tenant!.countryCode!,
        tenantPartner.tenant!.partyId!,
        tenantPartner.partnerProfileOCPI!,
        responseUrl,
        {
          result: CommandResultType.FAILED,
          message: {
            language: 'en',
            text: 'Charging station communication failed',
          },
        },
        commandId,
      );
    }
  }

  protected validate<T>(protocol: string, schema: any, data: unknown): T {
    let validate = this.ajv.getSchema(schema['$id']);
    if (!validate) {
      schema['$id'] = `${protocol}-${schema['$id']}`;
      this.logger.debug(`Updated call result schema id: ${schema['$id']}`);
      validate = this.ajv.compile(schema);
    }

    if (!validate(data)) {
      const errors = validate.errors
        ?.map((err) => `${err.instancePath} ${err.message}`)
        .join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }

    return data as T;
  }
}
