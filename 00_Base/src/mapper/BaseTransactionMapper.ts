import { Authorization, Tariff, TransactionEvent } from '@citrineos/data';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { ILogObj, Logger } from 'tslog';
import { Price } from '../model/Price';
import { Session } from '../model/Session';
import { Tariff as OcpiTariff } from '../model/Tariff';
import { TariffKey } from '../model/OcpiTariff';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { LocationsService } from '../services/LocationsService';
import { OcpiTokensMapper } from './OcpiTokensMapper';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import {
  GetLocationByIdQuery,
  GetAuthorizationByIdQuery,
  GetTariffByIdQuery,
  GetTariffByCoreKeyQuery,
} from '../graphql/types/graphql';
import { GET_LOCATION_BY_ID_QUERY } from '../graphql/queries/location.queries';
import { EvseDTO } from '../model/DTO/EvseDTO';
import { GET_AUTHORIZATION_BY_ID_QUERY } from '../graphql/queries/token.queries';
import {
  GET_TARIFF_BY_CORE_KEY_QUERY,
  GET_TARIFF_BY_ID_QUERY,
} from '../graphql/queries/tariff.queries';
import {
  ITransactionDto,
  ITransactionEventDto,
  OCPP2_0_1,
} from '@citrineos/base';

export abstract class BaseTransactionMapper {
  protected constructor(
    protected logger: Logger<ILogObj>,
    protected locationsService: LocationsService,
    protected ocpiGraphqlClient: OcpiGraphqlClient,
  ) {}

  public async getLocationDTOsForTransactions(
    transactions: ITransactionDto[],
  ): Promise<Map<string, LocationDTO>> {
    const transactionIdToLocationMap: Map<string, LocationDTO> = new Map();
    for (const transaction of transactions) {
      const locationId = transaction.chargingStation?.location?.id;

      if (!locationId) {
        continue;
      }

      const result = await this.ocpiGraphqlClient.request<GetLocationByIdQuery>(
        GET_LOCATION_BY_ID_QUERY,
        { id: locationId },
      );
      const location = result.Locations?.[0];

      if (!location) {
        continue;
      }

      const locationDto: LocationDTO = {
        id: location.id.toString(),
        name: location.name,
        address: location.address!,
        city: location.city!,
        postal_code: location.postalCode,
        state: location.state,
        country: location.country!,
        coordinates: location.coordinates,
        evses:
          (location.ChargingStations?.[0]?.Evses?.map((evse) => ({
            uid: evse.Evse?.id,
            id: evse.Evse?.id,
          })) as unknown as EvseDTO[]) || [],
      } as LocationDTO;

      transactionIdToLocationMap.set(transaction.transactionId!, locationDto);
    }
    return transactionIdToLocationMap;
  }

  protected async getTokensForTransactions(
    transactions: ITransactionDto[],
  ): Promise<Map<string, TokenDTO>> {
    const transactionIdToTokenMap: Map<string, TokenDTO> = new Map();

    for (const transaction of transactions) {
      const startEvent = transaction.transactionEvents?.find(
        (event) => event.eventType === 'Started',
      );
      const idTokenValue = startEvent?.transactionInfo?.idToken?.uid;
      const idTokenType = startEvent?.transactionInfo?.idToken?.type;

      if (idTokenValue && idTokenType) {
        const result =
          await this.ocpiGraphqlClient.request<GetAuthorizationByIdQuery>(
            GET_AUTHORIZATION_BY_ID_QUERY,
            { idToken: idTokenValue, idTokenType: idTokenType },
          );
        const authorization = result.Authorizations?.[0];

        if (authorization) {
          const tokenDto = await OcpiTokensMapper.toDto(
            authorization as unknown as Authorization,
            authorization as any,
          );
          if (tokenDto) {
            transactionIdToTokenMap.set(transaction.transactionId!, tokenDto);
          }
        }
      }
    }

    return transactionIdToTokenMap;
  }

  protected async getTariffsForTransactions(
    transactions: ITransactionDto[],
  ): Promise<Map<string, Tariff>> {
    const transactionIdToTariffMap = new Map<string, Tariff>();
    const uniqueStationIds = [...new Set(transactions.map((t) => t.stationId))];

    for (const stationId of uniqueStationIds) {
      const result = await this.ocpiGraphqlClient.request<GetTariffByIdQuery>(
        GET_TARIFF_BY_ID_QUERY,
        { stationId: stationId },
      );
      const tariff = result.Tariffs?.[0];
      if (tariff) {
        transactionIdToTariffMap.set(stationId!, tariff as unknown as Tariff);
      }
    }

    for (const transaction of transactions) {
      const tariff = transactionIdToTariffMap.get(transaction.stationId!); // Use stationId to get the tariff
      if (tariff) {
        transactionIdToTariffMap.set(transaction.transactionId!, tariff);
      }
    }

    return transactionIdToTariffMap;
  }

  protected async getOcpiTariffsForTransactions(
    sessions: Session[],
    transactionIdToTariffMap: Map<string, Tariff>,
  ): Promise<Map<string, OcpiTariff>> {
    const transactionIdToOcpiTariffMap = new Map<string, OcpiTariff>();
    await Promise.all(
      sessions
        .filter((session) => transactionIdToTariffMap.get(session.id))
        .map(async (session) => {
          const tariffKey = {
            id: String(transactionIdToTariffMap.get(session.id)?.id),
            // TODO: Ensure CPO Country Code, Party ID exists for the tariff in question
            countryCode: session.country_code,
            partyId: session.party_id,
          } as TariffKey;
          const result =
            await this.ocpiGraphqlClient.request<GetTariffByCoreKeyQuery>(
              GET_TARIFF_BY_CORE_KEY_QUERY,
              tariffKey,
            );
          const tariff = result.Tariffs?.[0];
          if (tariff) {
            transactionIdToOcpiTariffMap.set(
              session.id,
              tariff as unknown as OcpiTariff,
            );
          }
        }),
    );
    return transactionIdToOcpiTariffMap;
  }

  protected calculateTotalCost(totalKwh: number, tariffCost: number): Price {
    return {
      excl_vat: Math.floor(totalKwh * tariffCost * 100) / 100,
    };
  }

  protected getStartAndEndEvents(
    transaction: ITransactionDto,
  ): [ITransactionEventDto, ITransactionEventDto | undefined] {
    let startEvent = transaction.transactionEvents?.find(
      (event) => event.eventType === OCPP2_0_1.TransactionEventEnumType.Started,
    );
    if (!startEvent) {
      this.logger.error("No 'Started' event found in transaction events");
      startEvent = TransactionEvent.build() as unknown as ITransactionEventDto;
    }

    const endEvent = transaction.transactionEvents?.find(
      (event) => event.eventType === OCPP2_0_1.TransactionEventEnumType.Ended,
    );
    return [startEvent, endEvent];
  }
}
