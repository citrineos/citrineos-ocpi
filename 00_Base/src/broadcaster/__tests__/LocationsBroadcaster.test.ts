// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * LocationsBroadcaster — CPO-side outbound push for locations/EVSEs/connectors.
 *
 * IMPORTANT: most of this broadcaster is currently unreachable. As of this
 * commit, 03_Modules/Locations/src/index.ts has the broadcast calls commented
 * out in handleLocationInsert (:120), handleLocationUpdate (:155),
 * handleChargingStationUpdate (:176), handleEvseInsert (:202),
 * handleEvseUpdate (:243), handleConnectorInsert (:273) and the
 * broadcastPatchConnector branch of handleConnectorUpdate (:357).
 *
 * Only three paths are live:
 *   - broadcastPatchEvseStatus            (handleConnectorUpdate, isStatusChanged)
 *   - broadcastPatchConnectorTariffs      (non-Gireve partners)
 *   - broadcastPatchConnectorTariffsGireve (Gireve partners only)
 *
 * The "live paths" block below is the coverage that matters. The
 * "currently unwired" block keeps the dead methods honest so they don't rot
 * before someone re-enables them — do NOT read it as end-to-end coverage.
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

// LocationsBroadcaster calls STATIC mapper methods (unlike Session/Cdr broadcasters,
// which take injected mapper instances), so the barrel stub needs static fns.
// Stubbing it also avoids the json-schema-faker import chain.
jest.mock('../../mapper/index', () => ({
  LocationMapper: {
    fromGraphql: jest.fn(),
    fromPartialGraphql: jest.fn(),
  },
  EvseMapper: {
    fromGraphql: jest.fn(),
    fromPartialGraphql: jest.fn(),
    mapEvseStatusFromConnectors: jest.fn(),
  },
  ConnectorMapper: {
    fromGraphql: jest.fn(),
    fromPartialGraphql: jest.fn(),
  },
}));

jest.mock('../../util/helpers', () => ({
  // Same convention as GireveBroadcastRetry.test.ts: FR/007 is Gireve.
  isGirevePartner: jest.fn(
    ({ countryCode, partyId }: { countryCode?: string; partyId?: string }) =>
      countryCode === 'FR' && partyId === '007',
  ),
}));

import { LocationsBroadcaster } from '../LocationsBroadcaster.js';
import { ModuleId } from '../../model/ModuleId.js';
import { InterfaceRole } from '../../model/InterfaceRole.js';
import { HttpMethod } from '@zetra/citrineos-base';
import {
  ConnectorMapper,
  EvseMapper,
  LocationMapper,
} from '../../mapper/index.js';

const GIREVE_PARTNER = { id: 7, countryCode: 'FR', partyId: '007' } as any;
const NORMAL_PARTNER = { id: 1, countryCode: 'DE', partyId: 'EVP' } as any;

const tenant = { countryCode: 'FR', partyId: 'ZET' } as any;

describe('LocationsBroadcaster', () => {
  let broadcaster: LocationsBroadcaster;
  let mockLogger: any;
  let mockLocationsClientApi: { broadcastToClients: jest.Mock };

  /** Pull the params of the Nth recorded broadcastToClients call. */
  const callArg = (n = 0) =>
    mockLocationsClientApi.broadcastToClients.mock.calls[n][0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    mockLocationsClientApi = {
      broadcastToClients: jest.fn().mockResolvedValue([]),
    };

    broadcaster = new LocationsBroadcaster(
      mockLogger,
      {} as any, // credentialsService — unused by these methods
      mockLocationsClientApi as any,
    );
  });

  // ===========================================================================
  // LIVE PATHS — these are actually reachable from LocationsModule today
  // ===========================================================================

  describe('broadcastPatchEvseStatus (live: handleConnectorUpdate, isStatusChanged)', () => {
    const evseDto = { stationId: 'ST1', evseTypeId: 3 } as any;
    const chargingStationDto = { locationId: 'LOC1' } as any;
    const lastUpdated = new Date('2026-01-01T10:00:00Z');

    it('PATCHes the EVSE with only status + last_updated', async () => {
      await broadcaster.broadcastPatchEvseStatus(
        tenant,
        evseDto,
        lastUpdated,
        chargingStationDto,
        'AVAILABLE' as any,
      );

      expect(callArg()).toEqual(
        expect.objectContaining({
          cpoCountryCode: 'FR',
          cpoPartyId: 'ZET',
          moduleId: ModuleId.Locations,
          interfaceRole: InterfaceRole.RECEIVER,
          httpMethod: HttpMethod.Patch,
          path: '/FR/ZET/LOC1/ST1::3', // UID_FORMAT = `${stationId}::${evseTypeId}`
          body: { status: 'AVAILABLE', last_updated: lastUpdated },
        }),
      );
    });

    // No partnerFilter => every eligible partner gets the status patch.
    it('applies no partner filter, so all partners receive it', async () => {
      await broadcaster.broadcastPatchEvseStatus(
        tenant,
        evseDto,
        lastUpdated,
        chargingStationDto,
        'CHARGING' as any,
      );

      expect(callArg().partnerFilter).toBeUndefined();
    });

    it('throws when the charging station has no locationId', async () => {
      await expect(
        broadcaster.broadcastPatchEvseStatus(
          tenant,
          evseDto,
          lastUpdated,
          {} as any,
          'AVAILABLE' as any,
        ),
      ).rejects.toThrow('Location ID missing in EVSE data');
      expect(mockLocationsClientApi.broadcastToClients).not.toHaveBeenCalled();
    });

    it('swallows a broadcast failure and logs it', async () => {
      mockLocationsClientApi.broadcastToClients.mockRejectedValueOnce(
        new Error('partner 500'),
      );

      await expect(
        broadcaster.broadcastPatchEvseStatus(
          tenant,
          evseDto,
          lastUpdated,
          chargingStationDto,
          'AVAILABLE' as any,
        ),
      ).resolves.toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('broadcastPatchConnectorTariffs (live: non-Gireve partners only)', () => {
    const lastUpdated = new Date('2026-01-01T10:00:00Z');

    it('PATCHes the CONNECTOR with the OCPI-spec tariff body', async () => {
      await broadcaster.broadcastPatchConnectorTariffs(
        tenant,
        'LOC1',
        'ST1',
        3,
        9,
        ['T1', 'T2'],
        lastUpdated,
      );

      expect(callArg()).toEqual(
        expect.objectContaining({
          httpMethod: HttpMethod.Patch,
          path: '/FR/ZET/LOC1/ST1::3/9', // connector-level path
          body: { tariff_ids: ['T1', 'T2'], last_updated: lastUpdated },
        }),
      );
    });

    it('excludes Gireve partners via partnerFilter', async () => {
      await broadcaster.broadcastPatchConnectorTariffs(
        tenant,
        'LOC1',
        'ST1',
        3,
        9,
        ['T1'],
        lastUpdated,
      );

      const filter = callArg().partnerFilter!;
      expect(filter(GIREVE_PARTNER)).toBe(false);
      expect(filter(NORMAL_PARTNER)).toBe(true);
    });
  });

  describe('broadcastPatchConnectorTariffsGireve (live: Gireve partners only)', () => {
    const lastUpdated = new Date('2026-01-01T10:00:00Z');
    const connectorA = { id: 9, evseId: 3, ocpiId: 'C9' } as any;
    const connectorB = { id: 10, evseId: 3, ocpiId: null } as any;

    beforeEach(() => {
      (EvseMapper.mapEvseStatusFromConnectors as jest.Mock).mockReturnValue(
        'AVAILABLE',
      );
      (ConnectorMapper.fromGraphql as jest.Mock).mockImplementation(
        (c: any) => ({
          id: String(c.id),
          standard: 'IEC_62196_T2',
        }),
      );
    });

    it('PATCHes the EVSE (not the connector) with status + all connectors', async () => {
      await broadcaster.broadcastPatchConnectorTariffsGireve(
        tenant,
        'LOC1',
        'ST1',
        3,
        [connectorA, connectorB],
        9,
        ['T1'],
        lastUpdated,
      );

      const arg = callArg();
      expect(arg.httpMethod).toBe(HttpMethod.Patch);
      expect(arg.path).toBe('/FR/ZET/LOC1/ST1::3'); // EVSE-level — no connector segment
      expect(arg.body).toEqual(
        expect.objectContaining({
          status: 'AVAILABLE',
          last_updated: lastUpdated,
        }),
      );
      expect(arg.body.connectors).toHaveLength(2);
    });

    it('attaches the new tariff_ids to the changed connector only', async () => {
      await broadcaster.broadcastPatchConnectorTariffsGireve(
        tenant,
        'LOC1',
        'ST1',
        3,
        [connectorA, connectorB],
        9,
        ['T1'],
        lastUpdated,
      );

      const connectors = callArg().body.connectors;
      const changed = connectors.find((c: any) => c.id === 'C9');
      const untouched = connectors.find((c: any) => c.id === '10');

      expect(changed).toEqual(
        expect.objectContaining({
          tariff_ids: ['T1'],
          last_updated: lastUpdated,
        }),
      );
      expect(untouched).not.toHaveProperty('tariff_ids');
    });

    it('falls back to String(c.id) when a connector has no ocpiId', async () => {
      await broadcaster.broadcastPatchConnectorTariffsGireve(
        tenant,
        'LOC1',
        'ST1',
        3,
        [connectorB],
        10,
        ['T1'],
        lastUpdated,
      );

      expect(callArg().body.connectors[0].id).toBe('10');
    });

    it('drops connectors the mapper cannot map', async () => {
      (ConnectorMapper.fromGraphql as jest.Mock)
        .mockReturnValueOnce({ id: '9' })
        .mockReturnValueOnce(undefined);

      await broadcaster.broadcastPatchConnectorTariffsGireve(
        tenant,
        'LOC1',
        'ST1',
        3,
        [connectorA, connectorB],
        9,
        ['T1'],
        lastUpdated,
      );

      expect(callArg().body.connectors).toHaveLength(1);
    });

    it('includes ONLY Gireve partners via partnerFilter', async () => {
      await broadcaster.broadcastPatchConnectorTariffsGireve(
        tenant,
        'LOC1',
        'ST1',
        3,
        [connectorA],
        9,
        ['T1'],
        lastUpdated,
      );

      const filter = callArg().partnerFilter!;
      expect(filter(GIREVE_PARTNER)).toBe(true);
      expect(filter(NORMAL_PARTNER)).toBe(false);
    });
  });

  // The two tariff broadcasts fire back-to-back from handleConnectorTariffChange.
  // Their filters must partition partners exactly — no partner may match both
  // (double-send) and no partner may match neither (silently dropped update).
  describe('Gireve / non-Gireve partition across the two tariff broadcasts', () => {
    const lastUpdated = new Date('2026-01-01T10:00:00Z');

    beforeEach(() => {
      (EvseMapper.mapEvseStatusFromConnectors as jest.Mock).mockReturnValue(
        'AVAILABLE',
      );
      (ConnectorMapper.fromGraphql as jest.Mock).mockReturnValue({ id: '9' });
    });

    it('routes each partner to exactly one of the two broadcasts', async () => {
      await broadcaster.broadcastPatchConnectorTariffs(
        tenant,
        'LOC1',
        'ST1',
        3,
        9,
        ['T1'],
        lastUpdated,
      );
      await broadcaster.broadcastPatchConnectorTariffsGireve(
        tenant,
        'LOC1',
        'ST1',
        3,
        [{ id: 9, evseId: 3, ocpiId: 'C9' } as any],
        9,
        ['T1'],
        lastUpdated,
      );

      const standardFilter = callArg(0).partnerFilter!;
      const gireveFilter = callArg(1).partnerFilter!;

      for (const partner of [GIREVE_PARTNER, NORMAL_PARTNER]) {
        const matches = [standardFilter(partner), gireveFilter(partner)].filter(
          Boolean,
        );
        expect(matches).toHaveLength(1); // exactly one, never both, never neither
      }
    });
  });

  // ===========================================================================
  // CURRENTLY UNWIRED — every caller is commented out in LocationsModule.
  // Thin coverage only: proves the method still builds a sane request, so it
  // doesn't silently rot before it's re-enabled. NOT end-to-end coverage.
  // ===========================================================================

  describe('currently unwired methods', () => {
    it('broadcastPutLocation builds a location-level PUT', async () => {
      (LocationMapper.fromGraphql as jest.Mock).mockReturnValue({
        id: 'LOC1',
        name: 'Site',
      });

      await broadcaster.broadcastPutLocation(tenant, { id: 'LOC1' } as any);

      expect(callArg()).toEqual(
        expect.objectContaining({
          httpMethod: HttpMethod.Put,
          path: '/FR/ZET/LOC1',
        }),
      );
    });

    it('broadcastPatchLocation throws when the location id is missing', async () => {
      await expect(
        broadcaster.broadcastPatchLocation(tenant, {} as any),
      ).rejects.toThrow('Location ID missing');
    });

    it('broadcastPutEvse builds an EVSE-level PUT', async () => {
      (EvseMapper.fromGraphql as jest.Mock).mockReturnValue({ uid: 'ST1::3' });

      await broadcaster.broadcastPutEvse(
        tenant,
        { stationId: 'ST1', id: 3 } as any,
        { locationId: 'LOC1' } as any,
      );

      expect(callArg()).toEqual(
        expect.objectContaining({
          httpMethod: HttpMethod.Put,
          path: '/FR/ZET/LOC1/ST1::3',
        }),
      );
    });

    it('broadcastPutEvse throws when the mapper returns nothing', async () => {
      (EvseMapper.fromGraphql as jest.Mock).mockReturnValue(undefined);

      await expect(
        broadcaster.broadcastPutEvse(
          tenant,
          { stationId: 'ST1', id: 3 } as any,
          { locationId: 'LOC1' } as any,
        ),
      ).rejects.toThrow('Failed to map EVSE data');
    });

    it('broadcastPutConnector builds a connector-level PUT', async () => {
      (ConnectorMapper.fromGraphql as jest.Mock).mockReturnValue({ id: '9' });

      await broadcaster.broadcastPutConnector(tenant, {
        id: 9,
        stationId: 'ST1',
        evseId: 3,
        chargingStation: { locationId: 'LOC1' },
      } as any);

      expect(callArg()).toEqual(
        expect.objectContaining({
          httpMethod: HttpMethod.Put,
          path: '/FR/ZET/LOC1/ST1::3/9',
        }),
      );
    });

    it('broadcastPutConnector throws when locationId is missing', async () => {
      await expect(
        broadcaster.broadcastPutConnector(tenant, {
          id: 9,
          chargingStation: {},
        } as any),
      ).rejects.toThrow('Location ID missing in Connector data');
    });
  });
});
