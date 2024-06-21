// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ConnectorDTO } from '../model/DTO/ConnectorDTO';
import { EvseDTO } from '../model/DTO/EvseDTO';
import { LocationDTO } from '../model/DTO/LocationDTO';

export interface IOcpiLocationMapper {
  mapToOcpiLocation(...sources: any[]): LocationDTO;

  mapToOcpiEvse(...sources: any[]): EvseDTO;

  mapToOcpiConnector(...sources: any[]): ConnectorDTO;
}
