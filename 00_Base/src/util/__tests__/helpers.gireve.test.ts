// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * The real Gireve decision logic: isGirevePartner, handleHttpMethodForPartner
 * and shouldBroadcastToPartner. These read OcpiConfig out of the typedi
 * container, so each test sets it explicitly.
 */

jest.mock('@zetra/citrineos-base', () => ({
  HttpMethod: {
    Get: 'GET',
    Post: 'POST',
    Put: 'PUT',
    Patch: 'PATCH',
    Delete: 'DELETE',
  },
  HttpHeader: { Authorization: 'Authorization' },
}));

// helpers.ts imports from '../index.js' (the 00_Base barrel), which pulls in
// KoaServer -> json-schema-faker. Stub the barrel with just what helpers needs,
// requireActual-ing the enums so identities match the rest of the codebase.
jest.mock('../../index', () => {
  const { ModuleId } = jest.requireActual('../../model/ModuleId');
  const { Role } = jest.requireActual('../../model/Role');
  const { OcpiConfigToken } = jest.requireActual('../../config/ocpi.types');
  return { ModuleId, Role, OcpiConfigToken, logDbBroadcast: jest.fn() };
});

import { Container } from 'typedi';
import {
  handleHttpMethodForPartner,
  isGirevePartner,
  shouldBroadcastToPartner,
} from '../helpers';
import { ModuleId } from '../../model/ModuleId';
import { Role } from '../../model/Role';
import { OcpiConfigToken } from '../../config/ocpi.types';
import { HttpMethod } from '@zetra/citrineos-base';

const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

const GIREVE = { id: 7, countryCode: 'FR', partyId: '007' } as any;
const NORMAL = { id: 1, countryCode: 'DE', partyId: 'EVP' } as any;

const withRoles = (partner: any, ...roles: string[]) => ({
  ...partner,
  partnerProfileOCPI: { roles: roles.map((role) => ({ role })) },
});

beforeEach(() => {
  Container.set(OcpiConfigToken, {
    gireve: { countryCode: 'FR', partyId: '007' },
  } as any);
});

describe('isGirevePartner', () => {
  it('matches only on both country code AND party id', () => {
    expect(isGirevePartner(GIREVE)).toBe(true);
    expect(isGirevePartner(NORMAL)).toBe(false);
    expect(isGirevePartner({ countryCode: 'FR', partyId: 'ZET' })).toBe(false);
    expect(isGirevePartner({ countryCode: 'DE', partyId: '007' })).toBe(false);
  });

  // Weird case: with no gireve block configured, both sides are undefined.
  // A partner with undefined identity would then compare equal.
  it('returns false for a normal partner when gireve config is absent', () => {
    Container.set(OcpiConfigToken, {} as any);
    expect(isGirevePartner(GIREVE)).toBe(false);
    expect(isGirevePartner(NORMAL)).toBe(false);
  });

  it('treats a partner with no identity as Gireve when gireve config is absent', () => {
    Container.set(OcpiConfigToken, {} as any);
    // Documents current behaviour: undefined === undefined. If a partner row
    // ever lacks countryCode/partyId, it would be classified as Gireve.
    expect(isGirevePartner({})).toBe(true);
  });
});

describe('handleHttpMethodForPartner', () => {
  it('rewrites PATCH to PUT for Gireve on Tokens and Sessions', () => {
    expect(
      handleHttpMethodForPartner(HttpMethod.Patch, ModuleId.Sessions, GIREVE),
    ).toBe(HttpMethod.Put);
    expect(
      handleHttpMethodForPartner(HttpMethod.Patch, ModuleId.Tokens, GIREVE),
    ).toBe(HttpMethod.Put);
  });

  // The rewrite is module-scoped. Tariffs and Locations are NOT included, so a
  // PATCH to Gireve stays a PATCH there. Harmless today (Tariffs only sends
  // PUT/DELETE) but a trap if a tariff PATCH is ever added.
  it('leaves PATCH alone for Tariffs, Cdrs and Locations even for Gireve', () => {
    for (const moduleId of [
      ModuleId.Tariffs,
      ModuleId.Cdrs,
      ModuleId.Locations,
    ]) {
      expect(
        handleHttpMethodForPartner(HttpMethod.Patch, moduleId, GIREVE),
      ).toBe(HttpMethod.Patch);
    }
  });

  it('leaves PATCH alone for non-Gireve partners on Sessions', () => {
    expect(
      handleHttpMethodForPartner(HttpMethod.Patch, ModuleId.Sessions, NORMAL),
    ).toBe(HttpMethod.Patch);
  });

  it('never rewrites PUT, POST or DELETE', () => {
    for (const method of [HttpMethod.Put, HttpMethod.Post, HttpMethod.Delete]) {
      expect(
        handleHttpMethodForPartner(method, ModuleId.Sessions, GIREVE),
      ).toBe(method);
    }
  });
});

describe('shouldBroadcastToPartner', () => {
  it('requires the EMSP (or HUB) role for Tariffs, Sessions, Cdrs and Locations', () => {
    for (const moduleId of [
      ModuleId.Tariffs,
      ModuleId.Sessions,
      ModuleId.Cdrs,
      ModuleId.Locations,
    ]) {
      expect(
        shouldBroadcastToPartner(
          withRoles(NORMAL, Role.EMSP),
          moduleId,
          logger,
        ),
      ).toBe(true);
      expect(
        shouldBroadcastToPartner(withRoles(NORMAL, Role.HUB), moduleId, logger),
      ).toBe(true);
      expect(
        shouldBroadcastToPartner(withRoles(NORMAL, Role.CPO), moduleId, logger),
      ).toBe(false);
    }
  });

  // Tokens is inverted: we push tokens AS an eMSP, so the partner must be a CPO.
  it('requires the CPO (or HUB) role for Tokens', () => {
    expect(
      shouldBroadcastToPartner(
        withRoles(NORMAL, Role.CPO),
        ModuleId.Tokens,
        logger,
      ),
    ).toBe(true);
    expect(
      shouldBroadcastToPartner(
        withRoles(NORMAL, Role.HUB),
        ModuleId.Tokens,
        logger,
      ),
    ).toBe(true);
    expect(
      shouldBroadcastToPartner(
        withRoles(NORMAL, Role.EMSP),
        ModuleId.Tokens,
        logger,
      ),
    ).toBe(false);
  });

  it('rejects a partner with no roles', () => {
    expect(
      shouldBroadcastToPartner(withRoles(NORMAL), ModuleId.Tariffs, logger),
    ).toBe(false);
  });

  it('rejects a partner with no OCPI profile at all', () => {
    expect(shouldBroadcastToPartner(NORMAL, ModuleId.Tariffs, logger)).toBe(
      false,
    );
  });

  it('rejects undefined, or a partner missing countryCode / partyId', () => {
    expect(shouldBroadcastToPartner(undefined, ModuleId.Tariffs, logger)).toBe(
      false,
    );
    expect(
      shouldBroadcastToPartner(
        withRoles({ id: 2, partyId: 'EVP' }, Role.EMSP),
        ModuleId.Tariffs,
        logger,
      ),
    ).toBe(false);
  });

  // The "Broadcast as CPO to Gireve disabled" guard at helpers.ts:65-72 is
  // COMMENTED OUT. So Gireve currently receives tariff/session/CDR pushes like
  // any other eMSP. This test pins that; it will fail (correctly) the day the
  // guard is re-enabled, which is the signal you want.
  it('currently ALLOWS broadcasting tariffs to Gireve (exclusion is disabled)', () => {
    expect(
      shouldBroadcastToPartner(
        withRoles(GIREVE, Role.EMSP),
        ModuleId.Tariffs,
        logger,
      ),
    ).toBe(true);
  });
});
