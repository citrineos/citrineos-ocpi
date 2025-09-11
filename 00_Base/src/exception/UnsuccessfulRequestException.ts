// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { IRestResponse } from 'typed-rest-client';

export class UnsuccessfulRequestException extends Error {
  iRestResponse?: IRestResponse<any>;

  constructor(message: string, iRestResponse?: IRestResponse<any>) {
    super(message);
    this.name = 'UnsuccessfulRequestException';
    this.iRestResponse = iRestResponse;
  }
}
