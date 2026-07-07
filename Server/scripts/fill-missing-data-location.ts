// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
//
// Set parkingType, operator, and owner on Locations with no owner tenant partner.
// DB value: ParkingLot (maps to OCPI PARKING_LOT via LocationMapper.mapLocationParkingType).
//
// Usage (from citrineos-ocpi root):
//   npx tsx ./Server/scripts/fill-missing-data-location.ts
//
// Configure HASURA_URL / ADMIN_SECRET in Server/scripts/.env

import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const HASURA_URL = process.env.HASURA_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 200);

/** CitrineOS DB enum (LocationParkingEnum.ParkingLot) → OCPI PARKING_LOT */
const PARKING_TYPE = 'ParkingLot';

const OPERATOR = { name: 'Zetra.' };
const OWNER = { name: 'Zetra' };

const LOCATION_WHERE = {
  ownerTenantPartnerId: { _is_null: true },
};

const NEEDS_UPDATE_WHERE = {
  _or: [
    { parkingType: { _is_null: true } },
    { parkingType: { _neq: PARKING_TYPE } },
    { operator: { _is_null: true } },
    { _not: { operator: { _contains: OPERATOR } } },
    { owner: { _is_null: true } },
    { _not: { owner: { _contains: OWNER } } },
  ],
};

const ALREADY_SET_WHERE = {
  _and: [
    { parkingType: { _eq: PARKING_TYPE } },
    { operator: { _contains: OPERATOR } },
    { owner: { _contains: OWNER } },
  ],
};

async function gql(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  if (!HASURA_URL || !ADMIN_SECRET) {
    throw new Error('Missing HASURA_URL / ADMIN_SECRET in Server/scripts/.env');
  }

  const res = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as {
    errors?: { message: string }[];
    data?: Record<string, unknown>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  return json.data ?? {};
}

type LocationRow = {
  id: number;
  name: string | null;
  parkingType: string | null;
  operator: { name?: string } | null;
  owner: { name?: string } | null;
};

async function countMatching(): Promise<{
  total: number;
  alreadySet: number;
  toUpdate: number;
}> {
  const result = await gql(
    `
    query CountLocationsWithoutTenantPartner($where: Locations_bool_exp!, $alreadySet: Locations_bool_exp!, $toUpdate: Locations_bool_exp!) {
      total: Locations_aggregate(where: $where) {
        aggregate { count }
      }
      alreadySet: Locations_aggregate(
        where: {
          _and: [
            $where
            $alreadySet
          ]
        }
      ) {
        aggregate { count }
      }
      toUpdate: Locations_aggregate(
        where: {
          _and: [
            $where
            $toUpdate
          ]
        }
      ) {
        aggregate { count }
      }
    }
  `,
    {
      where: LOCATION_WHERE,
      alreadySet: ALREADY_SET_WHERE,
      toUpdate: NEEDS_UPDATE_WHERE,
    },
  );

  const total = ((result.total as { aggregate?: { count?: number } })?.aggregate
    ?.count ?? 0) as number;
  const alreadySet = ((result.alreadySet as { aggregate?: { count?: number } })
    ?.aggregate?.count ?? 0) as number;
  const toUpdate = ((result.toUpdate as { aggregate?: { count?: number } })
    ?.aggregate?.count ?? 0) as number;

  return { total, alreadySet, toUpdate };
}

async function listSample(limit = 20): Promise<LocationRow[]> {
  const data = await gql(
    `
    query ListLocationsWithoutTenantPartner($where: Locations_bool_exp!, $limit: Int!) {
      Locations(where: $where, limit: $limit, order_by: { id: asc }) {
        id
        name
        parkingType
        operator
        owner
      }
    }
  `,
    { where: LOCATION_WHERE, limit },
  );

  return (data.Locations ?? []) as LocationRow[];
}

async function fetchBatch(offset: number): Promise<LocationRow[]> {
  const data = await gql(
    `
    query FetchLocationsWithoutTenantPartner(
      $where: Locations_bool_exp!
      $needsUpdate: Locations_bool_exp!
      $limit: Int!
      $offset: Int!
    ) {
      Locations(
        where: {
          _and: [
            $where
            $needsUpdate
          ]
        }
        limit: $limit
        offset: $offset
        order_by: { id: asc }
      ) {
        id
        name
        parkingType
        operator
        owner
      }
    }
  `,
    {
      where: LOCATION_WHERE,
      needsUpdate: NEEDS_UPDATE_WHERE,
      limit: BATCH_SIZE,
      offset,
    },
  );

  return (data.Locations ?? []) as LocationRow[];
}

async function updateLocation(id: number): Promise<void> {
  await gql(
    `
    mutation SetLocationDefaults(
      $id: Int!
      $parkingType: String!
      $operator: jsonb!
      $owner: jsonb!
    ) {
      update_Locations_by_pk(
        pk_columns: { id: $id }
        _set: {
          parkingType: $parkingType
          operator: $operator
          owner: $owner
        }
      ) {
        id
      }
    }
  `,
    { id, parkingType: PARKING_TYPE, operator: OPERATOR, owner: OWNER },
  );
}

async function run(): Promise<void> {
  console.log('Config:', {
    parkingType: PARKING_TYPE,
    ocpiParkingType: 'PARKING_LOT',
    operator: OPERATOR,
    owner: OWNER,
    filter: 'ownerTenantPartnerId is null',
  });

  const before = await countMatching();
  console.log('Before:', before);

  if (before.total === 0) {
    console.log('No locations without owner tenant partner.');
    return;
  }

  const sample = await listSample();
  console.log('Sample (before):', sample);

  if (before.toUpdate === 0) {
    console.log(
      'All matching locations already have parkingType, operator, and owner set.',
    );
    return;
  }

  let updated = 0;
  let offset = 0;

  while (offset < before.toUpdate) {
    const batch = await fetchBatch(offset);
    if (batch.length === 0) {
      break;
    }

    for (const location of batch) {
      await updateLocation(location.id);
      updated++;
    }

    offset += batch.length;
    console.log(`Progress: ${offset}/${before.toUpdate} processed`);
  }

  const after = await countMatching();
  console.log('After:', after);

  const afterSample = await listSample();
  console.log('Sample (after):', afterSample);

  console.log(
    `Updated: ${updated} row(s), skipped (already correct): ${before.alreadySet}`,
  );
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
