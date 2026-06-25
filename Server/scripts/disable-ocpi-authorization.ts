// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// this script is used to disable pulling tokens for our partners
// (by removing issuer from additionalInfo) this will prevent the partner from pulling tokens
// because the mapping requires the issuer to be present and will fail if it's not present

import dotenv from 'dotenv';
import path from 'path';
import { exit } from 'process';
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

const HASURA_URL = process.env.HASURA_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const TABLE = 'Authorizations';
const OLD_TENANT_ID = Number(process.env.OLD_TENANT_ID);
const NEW_TENANT_ID = Number(process.env.NEW_TENANT_ID);

if (!HASURA_URL) throw new Error('Missing HASURA_URL');

async function gql(query: string, variables: Record<string, unknown> = {}) {
  if (!HASURA_URL || !ADMIN_SECRET)
    throw new Error('Missing HASURA_URL / ADMIN_SECRET');
  const res = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

const data = await gql(`
  {
    ${TABLE} {
      id
      idToken
      idTokenType
      status
      additionalInfo
      TenantPartner {
        id
        countryCode
        partyId
      }
      tenants {
        tenantId
      }
    }
  }
`);

const rows = data[TABLE];
console.log(`Fetched ${rows.length} rows`);

const UPDATE_MUTATION = `
  mutation Update($id: Int!, $changes: ${TABLE}_set_input!) {
    update_${TABLE}_by_pk(pk_columns: { id: $id }, _set: $changes) { id }
  }
`;

const INSERT_TENANT_MUTATION = `
  mutation InsertAuthorizationTenant($authorizationId: Int!, $tenantId: Int!) {
    insert_AuthorizationTenants_one(
      object: { authorizationId: $authorizationId, tenantId: $tenantId }
      on_conflict: { constraint: AuthorizationTenants_authorizationId_tenantId_key, update_columns: [] }
    ) {
      authorizationId
      tenantId
    }
  }
`;

for (const row of rows) {
  const tenantIds = row.tenants?.map((t: any) => t.tenantId) ?? [];
  console.log('tenantIds', tenantIds);
  console.log('row.idTokenType', row.idTokenType);
  console.log('row.TenantPartner?.id', row.TenantPartner?.id);
  if (
    tenantIds.includes(OLD_TENANT_ID) &&
    row.idTokenType !== 'MacAddress' &&
    !row.TenantPartner?.id
  ) {
    const additionalInfo = [
      { type: 'eMAID', additionalIdToken: `FR*ZET*${row.idToken}` },
      { type: 'visual_number', additionalIdToken: `${row.idToken}` },
      { type: 'issuer', additionalIdToken: 'Zetra' },
    ];
    console.log('row', row);

    const changes = { additionalInfo };
    console.log('changes', changes);
    await gql(UPDATE_MUTATION, { id: row.id, changes });
  }
}

console.log('Done');
console.log('rows length', rows.length);
