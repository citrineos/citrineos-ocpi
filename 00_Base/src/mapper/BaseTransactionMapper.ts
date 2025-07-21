import { Tariff } from '@citrineos/data';
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
  GetTariffByCoreKeyQuery,
} from '../graphql/types/graphql';
import { GET_LOCATION_BY_ID_QUERY } from '../graphql/queries/location.queries';
import { GET_TARIFF_BY_CORE_KEY_QUERY } from '../graphql/queries/tariff.queries';
import { ITransactionDto, ILocationDto } from '@citrineos/base';
import { LocationMapper } from './LocationMapper';

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

      const locationDto = LocationMapper.fromGraphql(
        location as unknown as ILocationDto,
      );

      transactionIdToLocationMap.set(transaction.transactionId!, locationDto);
    }
    return transactionIdToLocationMap;
  }

  protected async getTokensForTransactions(
    transactions: ITransactionDto[],
  ): Promise<Map<string, TokenDTO>> {
    const transactionIdToTokenMap: Map<string, TokenDTO> = new Map();

    for (const transaction of transactions) {
      if (transaction.authorization) {
        const tokenDto = await OcpiTokensMapper.toDto(
          transaction.authorization,
        );
        if (tokenDto) {
          transactionIdToTokenMap.set(transaction.transactionId!, tokenDto);
        }
      }
    }

    return transactionIdToTokenMap;
  }

  protected async getTariffsForTransactions(
    transactions: ITransactionDto[],
  ): Promise<Map<string, Tariff>> {
    const transactionIdToTariffMap = new Map<string, Tariff>();
    for (const transaction of transactions) {
      const tariffs = transaction?.connector?.tariffs;
      if (tariffs && tariffs.length > 0) {
        const tariff = tariffs[0];
        if (tariff) {
          transactionIdToTariffMap.set(
            transaction.transactionId!,
            tariff as unknown as Tariff,
          );
        }
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
}
