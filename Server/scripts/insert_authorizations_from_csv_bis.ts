// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const HASURA_URL = process.env.HASURA_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const AUTHORIZATIONS_CSV =
  process.env.AUTHORIZATIONS_CSV ?? 'files/export_public_Authorizations.csv';
const AUTHORIZATION_TENANTS_CSV =
  process.env.AUTHORIZATION_TENANTS_CSV ??
  'files/export_public_AuthorizationTenants.csv';
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? 500);

if (!HASURA_URL || !ADMIN_SECRET) {
  throw new Error('Missing HASURA_URL / ADMIN_SECRET');
}

function cleanValue(val: string): string | null {
  if (val === 'null' || val === '') return null;
  if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
  return val;
}

function parseJsonField(val: string | null): unknown {
  if (val == null || val === 'null' || val === '') return null;
  try {
    return JSON.parse(val);
  } catch {
    return JSON.parse(val.replace(/'/g, '"'));
  }
}

function parseCsv(filePath: string): Record<string, string | null>[] {
  const raw = fs.readFileSync(resolve(__dirname, filePath), 'utf-8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as Record<string, unknown>[];

  return records.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        cleanValue(typeof v === 'string' ? v : String(v ?? '')),
      ]),
    ),
  );
}

function toInt(val: string | null): number | null {
  if (val == null) return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

function mapAuthorizationRow(
  row: Record<string, string | null>,
): Record<string, unknown> {
  const object: Record<string, unknown> = {
    id: toInt(row.id) ?? undefined,
    idToken: row.idToken,
    idTokenType: row.idTokenType,
    status: row.status,
    realTimeAuth: row.realTimeAuth ?? 'Always',
    concurrentTransaction: row.concurrentTransaction === 'true',
    tenantPartnerId: toInt(row.tenantPartnerId),
    groupAuthorizationId: toInt(row.groupAuthorizationId),
    chargingPriority: toInt(row.chargingPriority),
    roamingPartnerId: toInt(row.roamingPartnerId),
    realTimeAuthTimeout: toInt(row.realTimeAuthTimeout),
    language1: row.language1,
    language2: row.language2,
    realTimeAuthUrl: row.realTimeAuthUrl,
    realTimeAuthLastAttempt: row.realTimeAuthLastAttempt,
    cacheExpiryDateTime: row.cacheExpiryDateTime,
    personalMessage: parseJsonField(row.personalMessage),
    additionalInfo: parseJsonField(row.additionalInfo),
    customData: parseJsonField(row.customData),
    allowedConnectorTypes: parseJsonField(row.allowedConnectorTypes),
    disallowedEvseIdPrefixes: parseJsonField(row.disallowedEvseIdPrefixes),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return Object.fromEntries(
    Object.entries(object).filter(([, v]) => v !== undefined),
  );
}

function mapAuthorizationTenantRow(
  row: Record<string, string | null>,
): Record<string, unknown> {
  const object: Record<string, unknown> = {
    id: toInt(row.id) ?? undefined,
    authorizationId: toInt(row.authorizationId),
    tenantId: toInt(row.tenantId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  return Object.fromEntries(
    Object.entries(object).filter(([, v]) => v !== undefined && v !== null),
  );
}

const GET_EXISTING_AUTHORIZATIONS = `
  query GetExistingAuthorizations {
    Authorizations {
      id
      idToken
      idTokenType
    }
  }
`;

const INSERT_AUTHORIZATIONS = `
  mutation InsertAuthorizations($objects: [Authorizations_insert_input!]!) {
    insert_Authorizations(
      objects: $objects
      on_conflict: { constraint: Authorizations_pkey, update_columns: [] }
    ) {
      affected_rows
    }
  }
`;

const INSERT_AUTHORIZATION_TENANTS = `
  mutation InsertAuthorizationTenants($objects: [AuthorizationTenants_insert_input!]!) {
    insert_AuthorizationTenants(
      objects: $objects
      on_conflict: {
        constraint: AuthorizationTenants_authorizationId_tenantId_key
        update_columns: []
      }
    ) {
      affected_rows
    }
  }
`;

const RESET_SEQUENCES = `
  mutation ResetSequences {
  a: run_sql(args: {
    source: "default"
    sql: "SELECT setval(pg_get_serial_sequence('\\\"Authorizations\\\"', 'id'), COALESCE((SELECT MAX(id) FROM \\\"Authorizations\\\"), 1));"
  }) { result }
  b: run_sql(args: {
    source: "default"
    sql: "SELECT setval(pg_get_serial_sequence('\\\"AuthorizationTenants\\\"', 'id'), COALESCE((SELECT MAX(id) FROM \\\"AuthorizationTenants\\\"), 1));"
  }) { result }
  }
`;

async function gql(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
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
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error(json.errors[0].message);
  }
  if (!json.data) {
    throw new Error('No data in GraphQL response — check HASURA_URL');
  }
  return json.data;
}

function tokenKey(idToken: unknown, idTokenType: unknown): string {
  return `${idToken}\0${idTokenType}`;
}

function buildCsvIdToDbIdMap(
  authorizationRows: Record<string, unknown>[],
  existingByToken: Map<string, number>,
): {
  toInsert: Record<string, unknown>[];
  csvIdToDbId: Map<number, number>;
  skippedExisting: number;
} {
  const toInsert: Record<string, unknown>[] = [];
  const csvIdToDbId = new Map<number, number>();
  let skippedExisting = 0;

  for (const row of authorizationRows) {
    const csvId = row.id as number;
    const key = tokenKey(row.idToken, row.idTokenType);
    const existingId = existingByToken.get(key);

    if (existingId != null) {
      csvIdToDbId.set(csvId, existingId);
      skippedExisting++;
      console.log(
        `Skip Authorization csv id=${csvId} (${row.idToken}/${row.idTokenType}) — already exists as db id=${existingId}`,
      );
      continue;
    }

    toInsert.push(row);
    csvIdToDbId.set(csvId, csvId);
  }

  return { toInsert, csvIdToDbId, skippedExisting };
}

function remapAuthorizationTenantRows(
  tenantRows: Record<string, unknown>[],
  csvIdToDbId: Map<number, number>,
): Record<string, unknown>[] {
  return tenantRows.map((row) => {
    const csvAuthId = row.authorizationId as number;
    const dbAuthId = csvIdToDbId.get(csvAuthId);
    if (dbAuthId == null) {
      throw new Error(
        `No db id mapping for AuthorizationTenants authorizationId=${csvAuthId}`,
      );
    }
    return { ...row, authorizationId: dbAuthId };
  });
}

async function fetchExistingAuthorizationsByToken(): Promise<
  Map<string, number>
> {
  const data = await gql(GET_EXISTING_AUTHORIZATIONS);
  const rows = (data.Authorizations ?? []) as Array<{
    id: number;
    idToken: string;
    idTokenType: string;
  }>;
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(tokenKey(row.idToken, row.idTokenType), row.id);
  }
  return map;
}

async function insertInChunks(
  label: string,
  mutation: string,
  resultKey: string,
  objects: Record<string, unknown>[],
): Promise<number> {
  let total = 0;
  for (let i = 0; i < objects.length; i += CHUNK_SIZE) {
    const chunk = objects.slice(i, i + CHUNK_SIZE);
    const data = await gql(mutation, { objects: chunk });
    const affected = (data[resultKey] as { affected_rows: number })
      .affected_rows;
    total += affected;
    console.log(
      `[${label}] [${Math.min(i + chunk.length, objects.length)}/${objects.length}] inserted ${affected} rows`,
    );
  }
  return total;
}

function validateTenantLinks(
  authorizations: Record<string, unknown>[],
  tenantLinks: Record<string, unknown>[],
): void {
  const authIds = new Set(
    authorizations.map((r) => r.id).filter((id) => id != null),
  );
  const orphans = tenantLinks.filter(
    (r) => !authIds.has(r.authorizationId as number),
  );
  if (orphans.length > 0) {
    const sample = orphans
      .slice(0, 5)
      .map((r) => `authorizationId=${r.authorizationId}`)
      .join(', ');
    throw new Error(
      `${orphans.length} AuthorizationTenants rows reference missing Authorizations (e.g. ${sample})`,
    );
  }
}

async function main() {
  const authorizationRows =
    parseCsv(AUTHORIZATIONS_CSV).map(mapAuthorizationRow);
  const tenantRows = parseCsv(AUTHORIZATION_TENANTS_CSV).map(
    mapAuthorizationTenantRow,
  );

  console.log(`Parsed ${authorizationRows.length} Authorizations`);
  console.log(`Parsed ${tenantRows.length} AuthorizationTenants`);

  validateTenantLinks(authorizationRows, tenantRows);

  const existingByToken = await fetchExistingAuthorizationsByToken();
  const { toInsert, csvIdToDbId, skippedExisting } = buildCsvIdToDbIdMap(
    authorizationRows,
    existingByToken,
  );
  console.log(
    `Authorizations to insert: ${toInsert.length}, skipped (idToken_type exists): ${skippedExisting}`,
  );

  const remappedTenantRows = remapAuthorizationTenantRows(
    tenantRows,
    csvIdToDbId,
  );

  const authInserted = await insertInChunks(
    'Authorizations',
    INSERT_AUTHORIZATIONS,
    'insert_Authorizations',
    toInsert,
  );
  const tenantInserted = await insertInChunks(
    'AuthorizationTenants',
    INSERT_AUTHORIZATION_TENANTS,
    'insert_AuthorizationTenants',
    remappedTenantRows,
  );

  try {
    await gql(RESET_SEQUENCES);
    console.log(
      'Reset id sequences for Authorizations and AuthorizationTenants',
    );
  } catch (e) {
    console.warn(
      'Could not reset sequences via run_sql (optional). Reset manually if needed:',
      e,
    );
  }

  console.log('Done.', {
    authorizationsSkippedExisting: skippedExisting,
    authorizationsInserted: authInserted,
    authorizationTenantsInserted: tenantInserted,
  });
}

await main();
