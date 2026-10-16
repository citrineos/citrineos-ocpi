// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { IRestResponse } from 'typed-rest-client';

export class UnsuccessfulRequestException extends Error {
  iRestResponse?: IRestResponse<any>;
  // Upstream HTTP status and error code (e.g. the TS API `detail.code`), when
  // known, so callers can tell an expected conflict apart from a real failure.
  statusCode?: number;
  code?: string;

  constructor(
    message: string,
    iRestResponse?: IRestResponse<any>,
    upstream?: { statusCode?: number; code?: string },
  ) {
    super(message);
    this.name = 'UnsuccessfulRequestException';
    this.iRestResponse = iRestResponse;
    this.statusCode = upstream?.statusCode;
    this.code = upstream?.code;
  }
}
