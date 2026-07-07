// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
//
// Set capabilities on EVSEs whose location has no owner tenant partner.
// Adds RFID_READER (OCPI Capability) when missing.
//
// Usage (from citrineos-ocpi root):
//   npx tsx ./Server/scripts/fill-missing-data-evse.ts
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

/** OCPI 2.2.1 Capability enum value */
const RFID_READER = 'RFID_READER';

const EVSE_WHERE = {
  ChargingStation: {
    Location: {
      ownerTenantPartnerId: { _is_null: true },
    },
  },
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

type EvseRow = {
  id: number;
  stationId: string;
  capabilities: string[] | null;
};

function parseCapabilities(value: unknown): string[] | null {
  if (value == null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.filter((c): c is string => typeof c === 'string');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((c): c is string => typeof c === 'string')
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function hasRfidReader(capabilities: string[] | null): boolean {
  return capabilities?.includes(RFID_READER) ?? false;
}

function withRfidReader(capabilities: string[] | null): string[] {
  if (hasRfidReader(capabilities)) {
    return capabilities!;
  }
  return [...(capabilities ?? []), RFID_READER];
}

async function countMatching(): Promise<{
  total: number;
  alreadySet: number;
  toUpdate: number;
}> {
  const result = await gql(
    `
    query CountEvsesWithoutLocationTenantPartner(
      $where: Evses_bool_exp!
      $capability: jsonb!
    ) {
      total: Evses_aggregate(where: $where) {
        aggregate { count }
      }
      alreadySet: Evses_aggregate(
        where: {
          _and: [
            $where
            { capabilities: { _contains: $capability } }
          ]
        }
      ) {
        aggregate { count }
      }
    }
  `,
    { where: EVSE_WHERE, capability: [RFID_READER] },
  );

  const total = ((result.total as { aggregate?: { count?: number } })?.aggregate
    ?.count ?? 0) as number;
  const alreadySet = ((result.alreadySet as { aggregate?: { count?: number } })
    ?.aggregate?.count ?? 0) as number;

  return { total, alreadySet, toUpdate: total - alreadySet };
}

async function listSample(limit = 20): Promise<EvseRow[]> {
  const data = await gql(
    `
    query ListEvsesWithoutLocationTenantPartner(
      $where: Evses_bool_exp!
      $limit: Int!
    ) {
      Evses(
        where: $where
        limit: $limit
        order_by: { id: asc }
      ) {
        id
        stationId
        capabilities
      }
    }
  `,
    { where: EVSE_WHERE, limit },
  );

  return (
    (data.Evses ?? []) as {
      id: number;
      stationId: string;
      capabilities: unknown;
    }[]
  ).map((evse) => ({
    id: evse.id,
    stationId: evse.stationId,
    capabilities: parseCapabilities(evse.capabilities),
  }));
}

async function fetchBatch(offset: number): Promise<EvseRow[]> {
  const data = await gql(
    `
    query FetchEvsesWithoutLocationTenantPartner(
      $where: Evses_bool_exp!
      $limit: Int!
      $offset: Int!
    ) {
      Evses(
        where: $where
        limit: $limit
        offset: $offset
        order_by: { id: asc }
      ) {
        id
        stationId
        capabilities
      }
    }
  `,
    { where: EVSE_WHERE, limit: BATCH_SIZE, offset },
  );

  return (
    (data.Evses ?? []) as {
      id: number;
      stationId: string;
      capabilities: unknown;
    }[]
  ).map((evse) => ({
    id: evse.id,
    stationId: evse.stationId,
    capabilities: parseCapabilities(evse.capabilities),
  }));
}

async function updateCapabilities(
  id: number,
  capabilities: string[],
): Promise<void> {
  await gql(
    `
    mutation SetEvseCapabilities($id: Int!, $capabilities: jsonb!) {
      update_Evses_by_pk(
        pk_columns: { id: $id }
        _set: { capabilities: $capabilities }
      ) {
        id
      }
    }
  `,
    { id, capabilities },
  );
}

async function run(): Promise<void> {
  const { total, alreadySet, toUpdate } = await countMatching();
  console.log(`EVSEs on locations without owner tenant partner: ${total}`);
  console.log(`Already have ${RFID_READER}: ${alreadySet}`);
  console.log(`To update: ${toUpdate}`);

  if (toUpdate === 0) {
    console.log('Nothing to update.');
    return;
  }

  const sample = await listSample();
  console.log(
    'Sample (before):',
    sample.map((evse) => ({
      id: evse.id,
      stationId: evse.stationId,
      capabilities: evse.capabilities,
      expected: withRfidReader(evse.capabilities),
    })),
  );

  let updated = 0;
  let skipped = 0;
  let offset = 0;

  while (offset < total) {
    const batch = await fetchBatch(offset);
    if (batch.length === 0) {
      break;
    }

    for (const evse of batch) {
      if (hasRfidReader(evse.capabilities)) {
        skipped++;
        continue;
      }

      await updateCapabilities(evse.id, withRfidReader(evse.capabilities));
      updated++;
    }

    offset += batch.length;
    console.log(`Progress: ${offset}/${total} processed`);
  }

  const afterSample = await listSample();
  console.log(
    'Sample (after):',
    afterSample.map((evse) => ({
      id: evse.id,
      stationId: evse.stationId,
      capabilities: evse.capabilities,
    })),
  );

  console.log(
    `Updated: ${updated} row(s), skipped (already had ${RFID_READER}): ${skipped}`,
  );
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
