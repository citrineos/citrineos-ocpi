// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { BadRequestError } from 'routing-controllers';
import { CredentialsRoleDTO } from '../../model/DTO/CredentialsRoleDTO';
import { Role } from '../../model/Role';

export function validateRole(
  credentialsRoles: CredentialsRoleDTO[],
  role: Role,
) {
  for (const credentialsRole of credentialsRoles) {
    if (credentialsRole.role !== role) {
      throw new BadRequestError(
        `The CredentialsRole with country_code ${credentialsRole.country_code} and party_id ${credentialsRole.party_id} is a not ${role} role`,
      );
    }
  }
}
