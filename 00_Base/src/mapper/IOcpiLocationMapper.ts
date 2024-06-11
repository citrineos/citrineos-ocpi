// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Connector } from '../model/Connector';
import { Evse } from '../model/Evse';
import { Location } from '../model/Location';

export interface IOcpiLocationMapper {
  mapToOcpiLocation(...sources: any[]): Location;

  mapToOcpiEvse(...sources: any[]): Evse;

  mapToOcpiConnector(...sources: any[]): Connector;
}
