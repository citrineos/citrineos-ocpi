// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { IAuthorizationDto, ITariffDto, OCPP2_0_1 } from '@citrineos/base';
import { TokenDTO } from '../model/DTO/TokenDTO';
import { ILogObj, Logger } from 'tslog';
import { Price } from '../model/Price';
import { Session } from '../model/Session';
import { Tariff as OcpiTariff } from '../model/Tariff';
import { TariffDTO } from '../model/DTO/tariffs/TariffDTO';
import { LocationDTO } from '../model/DTO/LocationDTO';
import { LocationsService } from '../services/LocationsService';
import { OcpiGraphqlClient } from '../graphql/OcpiGraphqlClient';
import { GET_LOCATION_BY_ID_QUERY } from '../graphql/queries/location.queries';
// import { GET_TARIFF_BY_CORE_KEY_QUERY } from '../graphql/queries/tariff.queries';
import { ITransactionDto, ILocationDto } from '@citrineos/base';
import { LocationMapper } from './LocationMapper';
import { TokensMapper } from './TokensMapper';
import {
  GetAuthorizationByIdQueryResult,
  GetAuthorizationByIdQueryVariables,
  GetLocationByIdQueryResult,
  GetLocationByIdQueryVariables,
  GetTariffByKeyQueryResult,
  GetTariffByKeyQueryVariables,
} from '../graphql/operations';
import { GET_TARIFF_BY_KEY_QUERY } from '../graphql/queries/tariff.queries';
import { TariffMapper } from './TariffMapper';
import { GET_AUTHORIZATION_BY_ID } from '../graphql';

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
      if (!transaction.location && transaction.locationId) {
        const result = await this.ocpiGraphqlClient.request<
          GetLocationByIdQueryResult,
          GetLocationByIdQueryVariables
        >(GET_LOCATION_BY_ID_QUERY, { id: transaction.locationId });
        transaction.location = result.Locations[0] as ILocationDto;
      }
      const location = transaction.location;
      if (!location) {
        this.logger.debug(
          `Skipping transaction ${transaction.id} location ${transaction.locationId}`,
        );
        continue;
      }

      const locationDto = LocationMapper.fromGraphql(location);

      transactionIdToLocationMap.set(transaction.transactionId!, locationDto);
    }
    return transactionIdToLocationMap;
  }

  protected async getTokensForTransactions(
    transactions: ITransactionDto[],
  ): Promise<Map<string, TokenDTO>> {
    const transactionIdToTokenMap: Map<string, TokenDTO> = new Map();

    for (const transaction of transactions) {
      if (!transaction.authorization && transaction.authorizationId) {
        const result = await this.ocpiGraphqlClient.request<
          GetAuthorizationByIdQueryResult,
          GetAuthorizationByIdQueryVariables
        >(GET_AUTHORIZATION_BY_ID, { id: transaction.authorizationId });
        if (result.Authorizations_by_pk) {
          transaction.authorization =
            result.Authorizations_by_pk as IAuthorizationDto;
        }
      }
      if (transaction.authorization) {
        const tokenDto = await TokensMapper.toDto(transaction.authorization);
        if (tokenDto) {
          transactionIdToTokenMap.set(transaction.transactionId!, tokenDto);
        } else {
          this.logger.debug(`Unmapped token for transaction ${transaction.id}`);
        }
      } else {
        this.logger.debug(`No token for transaction ${transaction.id}`);
      }
    }

    return transactionIdToTokenMap;
  }

  protected async getTariffsForTransactions(
    transactions: ITransactionDto[],
  ): Promise<Map<string, ITariffDto>> {
    const transactionIdToTariffMap = new Map<string, ITariffDto>();
    for (const transaction of transactions) {
      if (!transaction.tariff && transaction.tariffId) {
        const result = await this.ocpiGraphqlClient.request<
          GetTariffByKeyQueryResult,
          GetTariffByKeyQueryVariables
        >(GET_TARIFF_BY_KEY_QUERY, {
          id: transaction.tariffId,
          countryCode: transaction.tenant!.countryCode!,
          partyId: transaction.tenant!.partyId!,
        });
        if (result.Tariffs[0]) {
          transaction.tariff = result.Tariffs[0] as ITariffDto;
        }
      }
      const tariff = transaction.tariff;
      if (tariff) {
        transactionIdToTariffMap.set(transaction.transactionId!, tariff);
      } else {
        this.logger.debug(`No tariff for ${transaction.id}`);
      }
    }
    return transactionIdToTariffMap;
  }

  protected async getOcpiTariffsForTransactions(
    sessions: Session[],
    transactionIdToTariffMap: Map<string, ITariffDto>,
  ): Promise<Map<string, OcpiTariff>> {
    const transactionIdToOcpiTariffMap = new Map<string, OcpiTariff>();
    await Promise.all(
      sessions
        .filter((session) => transactionIdToTariffMap.get(session.id))
        .map(async (session) => {
          const tariffVariables = {
            id: transactionIdToTariffMap.get(session.id)!.id!,
            // TODO: Ensure CPO Country Code, Party ID exists for the tariff in question
            countryCode: session.country_code,
            partyId: session.party_id,
          };
          const result = await this.ocpiGraphqlClient.request<
            GetTariffByKeyQueryResult,
            GetTariffByKeyQueryVariables
          >(GET_TARIFF_BY_KEY_QUERY, tariffVariables);
          const tariff = result.Tariffs[0] as ITariffDto;
          if (tariff) {
            transactionIdToOcpiTariffMap.set(
              session.id,
              TariffMapper.map(tariff),
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
