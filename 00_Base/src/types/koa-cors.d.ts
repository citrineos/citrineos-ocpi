// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

declare module '@koa/cors' {
  import { Middleware } from 'koa';

  interface CorsOptions {
    origin?: string | string[] | ((ctx: any) => string | Promise<string>);
    allowMethods?: string | string[];
    allowHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    exposeHeaders?: string | string[];
  }

  function cors(options?: CorsOptions): Middleware;
  export = cors;
}
