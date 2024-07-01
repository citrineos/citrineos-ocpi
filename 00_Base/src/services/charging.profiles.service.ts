import { Service } from 'typedi';
import { CommandExecutor } from '../util/command.executor';
import { OcpiResponse } from '../model/ocpi.response';
import {
  ChargingProfileResponse,
  ChargingProfileResultType,
} from '../model/ChargingProfileResponse';
import {
  buildGenericServerErrorResponse,
  buildGenericSuccessResponse,
  buildUnknownSessionResponse,
} from '../util/ResponseGenerator';
import { NotFoundException } from '../exception/NotFoundException';
import { SetChargingProfile } from '../model/SetChargingProfile';
import { v4 as uuidv4 } from 'uuid';
import { ModuleId } from '../model/ModuleId';
import { InterfaceRole } from '../model/InterfaceRole';
import { ChargingProfilesClientApi } from '../trigger/ChargingProfilesClientApi';
import { EndpointRepository } from '../repository/EndpointRepository';
import { ClientInformationRepository } from '../repository/ClientInformationRepository';
import { buildPutChargingProfileParams } from '../trigger/param/charging.profiles/put.charging.profile.params';
import { ActiveChargingProfile } from '../model/ActiveChargingProfile';
import {
  Evse,
  SequelizeTransactionEventRepository,
} from '@citrineos/data';
import { SessionChargingProfileRepository } from '../repository/SessionChargingProfileRepository';

@Service()
export class ChargingProfilesService {
  readonly TIMEOUT = 30;

  constructor(
    private commandExecutor: CommandExecutor,
    readonly client: ChargingProfilesClientApi,
    readonly endpointRepository: EndpointRepository,
    readonly clientInformationRepository: ClientInformationRepository,
    readonly sessionChargingProfileRepository: SessionChargingProfileRepository,
    readonly transactionEventRepository: SequelizeTransactionEventRepository,
  ) {}

  async getActiveChargingProfile(
    sessionId: string,
    duration: number,
    responseUrl: string,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    try {
      await this.commandExecutor.executeGetActiveChargingProfile(
        sessionId,
        duration,
        responseUrl,
      );
      return buildGenericSuccessResponse({
        result: ChargingProfileResultType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildUnknownSessionResponse(
          {
            result: ChargingProfileResultType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          e as NotFoundException,
        );
      }
      return buildGenericServerErrorResponse(
        {
          result: ChargingProfileResultType.REJECTED,
          timeout: this.TIMEOUT,
        },
        e as Error,
      );
    }
  }

  async deleteChargingProfile(
    sessionId: string,
    responseUrl: string,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    try {
      await this.commandExecutor.executeClearChargingProfile(
        sessionId,
        responseUrl,
      );
      return buildGenericSuccessResponse({
        result: ChargingProfileResultType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildUnknownSessionResponse(
          {
            result: ChargingProfileResultType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          e as NotFoundException,
        );
      }
      return buildGenericServerErrorResponse(
        {
          result: ChargingProfileResultType.REJECTED,
          timeout: this.TIMEOUT,
        },
        e as Error,
      );
    }
  }

  async putChargingProfile(
    sessionId: string,
    setChargingProfile: SetChargingProfile,
  ): Promise<OcpiResponse<ChargingProfileResponse>> {
    try {
      await this.commandExecutor.executePutChargingProfile(
        sessionId,
        setChargingProfile,
      );
      return buildGenericSuccessResponse({
        result: ChargingProfileResultType.ACCEPTED,
        timeout: this.TIMEOUT,
      });
    } catch (e) {
      if (e instanceof NotFoundException) {
        return buildUnknownSessionResponse(
          {
            result: ChargingProfileResultType.UNKNOWN_SESSION,
            timeout: this.TIMEOUT,
          },
          e as NotFoundException,
        );
      } else {
        return buildGenericServerErrorResponse(
          {} as ChargingProfileResponse,
          e as Error,
        );
      }
    }
  }

  async getEvseIdsWithActiveTransactionByStationId(
    stationId: string,
  ): Promise<number[]> {
    const activeTransactions =
      await this.transactionEventRepository.readAllTransactionsByQuery({
        where: {
          stationId: stationId,
          isActive: true,
        },
        include: [Evse],
      });

    const evseIds: number[] = [];
    activeTransactions.forEach((transaction) => {
      const evseId = transaction.evse?.id;
      if (evseId) {
        evseIds.push(evseId);
      }
    });
    return evseIds;
  }

  async getCompositeSchedules(
    stationId: string,
    evseId: number,
  ): Promise<void> {
    // duration: 3600s. Guide from OCPI 2.2.1: between 5 and 60 minutes.
    await this.commandExecutor.executeGetCompositeProfile(
      evseId,
      stationId,
      3600,
      uuidv4(),
    );
  }

  async pushChargingProfile(
    evseId: number,
    profileResult: ActiveChargingProfile,
  ) {
    // TODO: after Session Module is implemented
    //  (1) find active transaction id by evseId
    //  (2) find the session id by transaction id
    //  (3) find the session object by session id
    //  (4) get the country code and party id from the session and its cdr_token
    const sessionId = '12345';
    const toCountryCode = 'NL';
    const toPartyId = 'EXA';
    const fromCountryCode = 'NL';
    const fromPartyId = 'CPO';
    const url = await this.endpointRepository.readEndpoint(
      toCountryCode,
      toPartyId,
      ModuleId.ChargingProfiles,
      InterfaceRole.RECEIVER,
    );
    console.log(`Found endpointURL: ${url}`);
    const token = await this.clientInformationRepository.getClientToken(
      toCountryCode,
      toPartyId,
    );
    if (url && token) {
      const params = buildPutChargingProfileParams(
        `${url}/${sessionId}`,
        profileResult,
        token,
        fromCountryCode,
        fromPartyId,
        toCountryCode,
        toPartyId,
      );
      const response = await this.client.putChargingProfile(params);
      console.log(
        `Pushed charging profile with response: ${JSON.stringify(response)}`,
      );
    } else {
      console.error(
        `No URL or token found for charging profile with country code ${toCountryCode} and party id ${toPartyId}`,
      );
    }
  }

  async checkExistingSchedule(
    stationId: string,
    evseId?: number,
    transactionId?: string,
  ): Promise<boolean> {
    if (!evseId && !transactionId) {
      console.error('Missing evseId or transactionId');
      return false;
    }
    let activeTransactionId;
    if (transactionId) {
      activeTransactionId = transactionId;
    } else {
      const activeTransaction = (
        await this.transactionEventRepository.readAllTransactionsByQuery({
          where: {
            stationId: stationId,
            isActive: true,
          },
          include: [
            {
              model: Evse,
              where: {
                id: evseId,
              },
            },
          ],
        })
      )[0];
      activeTransactionId = activeTransaction?.transactionId;
    }

    if (activeTransactionId) {
      // TODO: map transactionId to sessionId after session module is implemented
      const sessionId = activeTransactionId;
      const existingSchedule =
        await this.sessionChargingProfileRepository.existByQuery({
          where: {
            sessionId: sessionId,
          },
        });
      return existingSchedule > 0;
    }

    return false;
  }

  async getEvseIdByStationIdAndTransactionId(
    stationId: string,
    transactionId: string,
  ): Promise<number | undefined> {
    const transaction =
      await this.transactionEventRepository.readTransactionByStationIdAndTransactionId(
        stationId,
        transactionId,
      );
    return transaction?.evse?.id;
  }
}
