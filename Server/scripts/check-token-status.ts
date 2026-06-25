// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// this script is used to check the status of the tokens

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

const HASURA_URL = process.env.HASURA_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!HASURA_URL || !ADMIN_SECRET)
  throw new Error('Missing HASURA_URL / ADMIN_SECRET');

const VALID_STATUSES = [
  'Accepted',
  'Blocked',
  'ConcurrentTx',
  'Expired',
  'Invalid',
  'NoCredit',
  'NotAllowedTypeEVSE',
  'NotAtThisLocation',
  'NotAtThisTime',
  'Unknown',
];

async function gql(query: string, variables: Record<string, any> = {}) {
  const res = await fetch(HASURA_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET!,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length)
    throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

const QUERY = `
  query GetInvalidStatusTokens($validStatuses: [String!]!) {
    Authorizations(
      where: { status: { _nin: $validStatuses } }
      order_by: { id: asc }
    ) {
      id
      idToken
      idTokenType
      status
    }
    Authorizations_aggregate(
      where: { status: { _nin: $validStatuses } }
    ) {
      aggregate { count }
    }
  }
`;

async function main() {
  const data = await gql(QUERY, { validStatuses: VALID_STATUSES });

  const total = data.Authorizations_aggregate.aggregate.count;
  console.log(`Found ${total} authorization(s) with invalid status:\n`);

  for (const auth of data.Authorizations) {
    console.log(
      `  id=${auth.id}  idToken=${auth.idToken}  type=${auth.idTokenType}  status="${auth.status}"`,
    );
  }

  if (total === 0) {
    console.log('All tokens have valid status values. Safe to run migration.');
  } else {
    console.log('\nFix with:');
    console.log(
      `UPDATE "Authorization" SET status = 'Accepted' WHERE status NOT IN (${VALID_STATUSES.map((s) => `'${s}'`).join(', ')});`,
    );
  }
}

main().catch(console.error);
