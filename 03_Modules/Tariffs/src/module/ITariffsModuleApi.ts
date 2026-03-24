// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type {
  OcpiEmptyResponse,
  PaginatedTariffResponse,
  PutTariffRequest,
  VersionNumber,
} from '@citrineos/ocpi-base';

export interface ITariffsModuleApi {
  getTariffs(
    version: VersionNumber,
    ...args: any[]
  ): Promise<PaginatedTariffResponse>;

  getTariffById(
    version: VersionNumber,
    countryCode: string,
    partyId: string,
    tariffId: string,
  ): Promise<any>;

  putTariff(
    version: VersionNumber,
    countryCode: string,
    partyId: string,
    tariffId: string,
    tariffBody: PutTariffRequest,
  ): Promise<any>;

  deleteTariff(
    version: VersionNumber,
    countryCode: string,
    partyId: string,
    tariffId: string,
  ): Promise<OcpiEmptyResponse>;
}
