// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { ChargingStationDto } from '@zetra/citrineos-base';
import type { GetChargingStationByIdQueryResult } from '../graphql/index.js';
import { EvseMapper } from './LocationMapper.js';

/** One row from GET_CHARGING_STATION_BY_ID_QUERY */
export type ChargingStationByIdRow =
  GetChargingStationByIdQueryResult['ChargingStations'][number];

/** Subset from GET_TRANSACTION_BY_TRANSACTION_ID_QUERY → chargingStation */
export type TransactionChargingStationRow = {
  id: string;
  isOnline?: boolean | null;
  protocol?: string | null;
};

export type ChargingStationByIdQueryContext = {
  station: ChargingStationDto;
  activeTransactionConnectorIds: ReadonlySet<number>;
};

export class ChargingStationMapper {
  static fromGetByIdQueryRow(
    row: ChargingStationByIdRow | undefined,
  ): ChargingStationDto | undefined {
    if (!row) {
      return undefined;
    }

    const station: ChargingStationDto = {
      id: row.id,
      tenantId: row.tenantId,
      isOnline: row.isOnline ?? false,
      protocol: row.protocol as ChargingStationDto['protocol'],
      chargePointVendor: row.chargePointVendor,
      chargePointModel: row.chargePointModel,
      chargePointSerialNumber: row.chargePointSerialNumber,
      chargeBoxSerialNumber: row.chargeBoxSerialNumber,
      firmwareVersion: row.firmwareVersion,
      iccid: row.iccid,
      imsi: row.imsi,
      meterType: row.meterType,
      meterSerialNumber: row.meterSerialNumber,
      locationId: row.locationId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      evses: row.evses as ChargingStationDto['evses'],
      connectors: row.connectors as ChargingStationDto['connectors'],
      tenant: row.tenant as ChargingStationDto['tenant'],
    };

    return station;
  }

  static fromGetByIdQueryRowWithContext(
    row: ChargingStationByIdRow | undefined,
  ): ChargingStationByIdQueryContext | undefined {
    const station = ChargingStationMapper.fromGetByIdQueryRow(row);
    if (!station || !row) {
      return undefined;
    }

    return {
      station,
      activeTransactionConnectorIds:
        EvseMapper.activeTransactionConnectorIds(row),
    };
  }

  static fromTransactionQueryRow(
    row: TransactionChargingStationRow | null | undefined,
  ): ChargingStationDto | undefined {
    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      isOnline: row.isOnline ?? false,
      protocol: row.protocol as ChargingStationDto['protocol'],
    };
  }
}
