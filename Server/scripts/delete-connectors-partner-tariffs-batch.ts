// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

const HASURA_URL = process.env.HASURA_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const TENANT_PARTNER_ID = Number(process.env.TENANT_PARTNER_ID ?? '14');
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? '200');
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!HASURA_URL || !ADMIN_SECRET) {
  throw new Error('Missing HASURA_URL / ADMIN_SECRET');
}
if (!Number.isFinite(TENANT_PARTNER_ID)) {
  throw new Error('Invalid TENANT_PARTNER_ID');
}

async function gql<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(HASURA_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET!,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

const WHERE_FILTER = {
  Tariff: {
    tenantPartnerId: { _eq: TENANT_PARTNER_ID },
    roamingPartnerId: { _is_null: true },
  },
};

async function countRemaining(): Promise<number> {
  const data = await gql(
    `
    query Count($where: ConnectorTariffs_bool_exp!) {
      ConnectorTariffs_aggregate(where: $where) {
        aggregate { count }
      }
    }
  `,
    { where: WHERE_FILTER },
  );
  return data.ConnectorTariffs_aggregate.aggregate.count as number;
}

async function fetchBatchIds(): Promise<number[]> {
  const data = await gql(
    `
    query GetBatch($where: ConnectorTariffs_bool_exp!, $limit: Int!) {
      ConnectorTariffs(
        where: $where
        limit: $limit
        order_by: { id: asc }
      ) {
        id
      }
    }
  `,
    { where: WHERE_FILTER, limit: BATCH_SIZE },
  );
  return (data.ConnectorTariffs as { id: number }[]).map((r) => r.id);
}

async function deleteBatch(ids: number[]): Promise<number> {
  const data = await gql(
    `
    mutation DeleteBatch($ids: [Int!]!) {
      delete_ConnectorTariffs(where: { id: { _in: $ids } }) {
        affected_rows
      }
    }
  `,
    { ids },
  );
  return data.delete_ConnectorTariffs.affected_rows as number;
}

async function main() {
  console.log({
    HASURA_URL,
    TENANT_PARTNER_ID,
    BATCH_SIZE,
    DRY_RUN,
  });

  let remaining = await countRemaining();
  console.log(`Starting ConnectorTariffs count: ${remaining}`);

  let totalDeleted = 0;
  let batch = 0;

  while (remaining > 0) {
    batch++;
    const ids = await fetchBatchIds();
    if (!ids.length) {
      console.log('No IDs returned but count > 0 — stop.');
      break;
    }

    console.log(
      `Batch ${batch}: deleting ${ids.length} ConnectorTariffs (${ids[0]}..${ids[ids.length - 1]})`,
    );

    if (DRY_RUN) {
      console.log('DRY_RUN=true — skipping delete');
      break;
    }

    const deleted = await deleteBatch(ids);
    totalDeleted += deleted;
    remaining = await countRemaining();

    console.log({ batch, deleted, totalDeleted, remaining });
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('Done', { totalDeleted, remaining });
}

await main();
