// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BusinessDetails } from './BusinessDetails';
import { Role } from './Role';
import { ClientInformation } from './ClientInformation';
import { CpoTenant } from './CpoTenant';

export interface ICredentialsRole {
  role: Role;
  business_details: BusinessDetails;
  cpoTenantId: number;
  cpoTenant: CpoTenant;
  clientInformationId?: number;
  clientInformation?: ClientInformation;
}

export class BaseCredentialsRole implements ICredentialsRole {
  role!: Role;
  business_details!: BusinessDetails;
  cpoTenantId!: number;
  cpoTenant!: CpoTenant;
  clientInformationId!: number;
  clientInformation!: ClientInformation;
}
