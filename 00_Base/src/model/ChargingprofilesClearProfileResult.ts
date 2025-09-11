// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { IsNotEmpty, IsString } from 'class-validator';

export class ClearChargingProfileResult {
  @IsString()
  @IsNotEmpty()
  result!: string;
}
