// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import 'reflect-metadata';
import Koa from 'koa';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { apiDocsAuthExemptRoutes, isApiDocsExposed } from '../apiDocs.js';
import { KoaServer } from '../KoaServer.js';

// The real spec helpers import the ESM-only @zetra/citrineos-base, which this jest setup cannot load.
jest.mock('../../openapi-spec-helper/index.js', () => ({
  routingControllersToSpec: (_s: unknown, _o: unknown, extra: object) => ({
    openapi: '3.0.0',
    paths: {},
    ...extra,
  }),
}));
jest.mock('../../openapi-spec-helper/schemas.js', () => ({
  getAllSchemas: () => ({}),
}));

const IN_CLUSTER = { KUBERNETES_SERVICE_HOST: '10.100.0.1' };
const DOCS_PATHS = ['/docs', '/docs/', '/docs/spec', '/ocpi/docs'];

class DocsTestServer extends KoaServer {
  constructor(exposeDocs: boolean) {
    super();
    this.app = new Koa();
    this.initKoaSwagger(
      { title: 'docs-test', version: '0.0.0' },
      [],
      exposeDocs,
    );
  }
}

describe('isApiDocsExposed', () => {
  it.each(['dev', 'staging'])('exposes docs in the %s namespace', (ns) => {
    expect(isApiDocsExposed(IN_CLUSTER, () => ns)).toBe(true);
  });

  it.each(['prod', 'demo', 'default', ''])(
    'hides docs in the "%s" namespace',
    (ns) => {
      expect(isApiDocsExposed(IN_CLUSTER, () => ns)).toBe(false);
    },
  );

  it('hides docs in a pod whose namespace cannot be read', () => {
    expect(isApiDocsExposed(IN_CLUSTER, () => undefined)).toBe(false);
  });

  it('exposes docs outside Kubernetes', () => {
    expect(isApiDocsExposed({}, () => undefined)).toBe(true);
  });
});

describe('apiDocsAuthExemptRoutes', () => {
  it('exempts no route from auth when docs are hidden', () => {
    expect(apiDocsAuthExemptRoutes(false)).toEqual([]);
  });

  it('exempts the docs routes when docs are exposed', () => {
    expect(apiDocsAuthExemptRoutes(true)).toEqual([
      '/docs',
      '/docs/spec',
      '/favicon.png',
    ]);
  });
});

describe('KoaServer docs routes', () => {
  let http: Server | undefined;

  const statuses = async (exposeDocs: boolean) => {
    const server = new DocsTestServer(exposeDocs);
    http = createServer(server.app.callback());
    await new Promise<void>((resolve) => http!.listen(0, '127.0.0.1', resolve));
    const { port } = http.address() as AddressInfo;
    const result: Record<string, number> = {};
    for (const path of DOCS_PATHS) {
      result[path] = (await fetch(`http://127.0.0.1:${port}${path}`)).status;
    }
    return { server, result };
  };

  afterEach(async () => {
    await new Promise((resolve) => (http ? http.close(resolve) : resolve(0)));
    http = undefined;
  });

  it('serves no docs route when docs are hidden, but still builds the spec', async () => {
    const { server, result } = await statuses(false);
    expect(result).toEqual(Object.fromEntries(DOCS_PATHS.map((p) => [p, 404])));
    expect(server.spec.info.title).toBe('docs-test');
  });

  it('serves the UI and the spec when docs are exposed', async () => {
    const { result } = await statuses(true);
    expect(result).toEqual(Object.fromEntries(DOCS_PATHS.map((p) => [p, 200])));
  });
});
