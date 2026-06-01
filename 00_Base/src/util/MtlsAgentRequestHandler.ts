// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { Agent } from 'node:http';
import type {
  IHttpClient,
  IHttpClientResponse,
  IRequestHandler,
  IRequestInfo,
} from 'typed-rest-client/Interfaces.js';

/** Overrides the HTTP agent on each request (typed-rest-client does not read options.agent). */
export class MtlsAgentRequestHandler implements IRequestHandler {
  constructor(private readonly agent: Agent) {}

  prepareRequest(options: { agent?: Agent }): void {
    options.agent = this.agent;
  }

  canHandleAuthentication(_response: IHttpClientResponse): boolean {
    return false;
  }

  handleAuthentication(
    _httpClient: IHttpClient,
    _requestInfo: IRequestInfo,
    _objs: unknown,
  ): Promise<IHttpClientResponse> {
    return Promise.reject(
      new Error('MtlsAgentRequestHandler does not handle authentication'),
    );
  }
}
