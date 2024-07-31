import {
  Authorization,
  ChargingStation,
  Tariff,
  Transaction,
  TransactionEvent,
} from '@citrineos/data';
import {
  TransactionEventEnumType,
  TransactionEventRequest,
} from '@citrineos/base';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { OcpiLocationRepository } from '../repository/OcpiLocationRepository';
import { TokensRepository } from '../repository/TokensRepository';
import { ILogObj, Logger } from 'tslog';
import { Price } from '../model/Price';
import { Session } from '../model/Session';
import { Tariff as OcpiTariff } from '../model/Tariff';
import { TariffKey } from '../model/OcpiTariff';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { LocationsService } from '../services/locations.service';
import { OcpiToken } from '../model/OcpiToken';
import { OcpiTokensMapper } from './OcpiTokensMapper';
import {TariffsDatasource} from "../datasources/TariffsDatasource";

export abstract class BaseTransactionMapper {
  protected constructor(
    protected logger: Logger<ILogObj>,
    protected locationsService: LocationsService,
    protected ocpiLocationsRepository: OcpiLocationRepository,
    protected tokensRepository: TokensRepository,
    protected tariffsDatasource: TariffsDatasource,
  ) {}

  public async getLocationDTOsForTransactions(
    transactions: Transaction[],
  ): Promise<Map<string, LocationDTO>> {
    const transactionIdToLocationMap: Map<string, LocationDTO> = new Map();
    for (const transaction of transactions) {
      let chargingStation: ChargingStation | null = transaction.station;
      if (!chargingStation) {
        chargingStation = await transaction.$get('station');
      }

      if (!chargingStation || !chargingStation.locationId) {
        continue;
      }

      const location = await this.locationsService.getLocationById(
        chargingStation.locationId,
      );

      if (!location || !location.data) {
        continue;
      }

      transactionIdToLocationMap.set(transaction.transactionId, location.data);
    }
    return transactionIdToLocationMap;
  }

  protected async getTokensForTransactions(
    transactions: Transaction[],
  ): Promise<Map<string, TokenDTO>> {
    const transactionIdToTokenMap: Map<string, TokenDTO> = new Map();

    for (const transaction of transactions) {
      const startEvent = transaction.transactionEvents?.find(
        (event) => event.eventType === 'Started',
      );
      const idToken = startEvent?.idToken;
      if (idToken) {
        const ocppAuth: Authorization = (idToken as any)?.authorization;
        const ocpiToken: OcpiToken = (ocppAuth as any)?.OcpiToken;
        let tokenDto: TokenDTO | undefined;
        if (ocppAuth && ocpiToken) {
          tokenDto = await OcpiTokensMapper.toDto(ocppAuth, ocpiToken);
        } else {
          tokenDto = await this.tokensRepository.getTokenDtoByIdToken(
            idToken.idToken,
            idToken.type,
          );
        }

        if (tokenDto) {
          transactionIdToTokenMap.set(transaction.transactionId, tokenDto);
        }
      }
    }

    return transactionIdToTokenMap;
  }

  protected async getTariffsForTransactions(
    transactions: Transaction[],
  ): Promise<Map<string, Tariff>> {
    const transactionIdToTariffMap = new Map<string, Tariff>();
    const uniqueStationIds = [...new Set(transactions.map((t) => t.stationId))];

    const stationIdToTariffMap = new Map<string, Tariff>();
    const tariffs =
      await this.tariffsDatasource.getCoreTariffsByStationIds(uniqueStationIds);
    tariffs?.forEach((tariff: any) =>
      stationIdToTariffMap.set(tariff.stationId, tariff),
    );

    for (const transaction of transactions) {
      const tariff = stationIdToTariffMap.get(transaction.stationId);
      if (tariff) {
        transactionIdToTariffMap.set(transaction.transactionId, tariff);
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
          const tariff =
            await this.tariffsDatasource.getTariffByCoreKey(tariffKey);
          if (tariff) {
            transactionIdToOcpiTariffMap.set(session.id, tariff);
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
    transaction: Transaction,
  ): [TransactionEventRequest, TransactionEventRequest | undefined] {
    let startEvent = transaction.transactionEvents?.find(
      (event) => event.eventType === TransactionEventEnumType.Started,
    );
    if (!startEvent) {
      this.logger.error("No 'Started' event found in transaction events");
      startEvent = TransactionEvent.build();
    }

    const endEvent = transaction.transactionEvents?.find(
      (event) => event.eventType === TransactionEventEnumType.Ended,
    );
    return [startEvent, endEvent];
  }
}
