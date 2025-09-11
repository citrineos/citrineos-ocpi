// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

export class NotRegisteredException extends Error {
  constructor() {
    super('Not registered');
    this.name = 'NotRegisteredException';
  }
}
