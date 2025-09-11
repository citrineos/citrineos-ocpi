// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Constructable } from 'typedi';

export abstract class OcpiModule {
  public abstract getController(): Constructable<any>;
}
