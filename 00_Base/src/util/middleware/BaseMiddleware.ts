// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { Context } from 'vm';

/**
 * Helper Base class for middlewares
 */
export class BaseMiddleware {
  protected getHeader(context: Context, header: string) {
    const headers = context.req.headers;
    return headers[header.toLowerCase()];
  }

  protected getRequestProtocol(context: Context): string {
    const forwardedProto = this.getHeader(context, 'x-forwarded-proto');
    if (typeof forwardedProto === 'string') {
      return forwardedProto.split(',')[0].trim();
    }
    return context.request.protocol;
  }

  protected getRequestOrigin(context: Context): string {
    return `${this.getRequestProtocol(context)}://${context.request.host}`;
  }
}
