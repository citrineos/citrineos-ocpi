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
const TABLE = 'Authorizations';
const CSV_FILE = process.env.CSV_FILE;
const CHUNK_SIZE = 500;

const raw = fs.readFileSync(resolve(__dirname, CSV_FILE!), 'utf-8');
function cleanValue(val: string) {
  if (val === 'null' || val === '') return null;
  if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
  return val;
}

const rows = parse(raw, { columns: true, skip_empty_lines: true })
  .map((row) =>
    Object.fromEntries(
      Object.entries(row as Record<string, unknown>).map(([k, v]) => [
        k,
        cleanValue(typeof v === 'string' ? v : String(v)),
      ]),
    ),
  )
  .map((row) => ({
    ...row,
    id: row.id ? parseInt(row.id) : null,
    tenantId: row.tenantId ? parseInt(row.tenantId) : null,
    tenantPartnerId: row.tenantPartnerId ? parseInt(row.tenantPartnerId) : null,
    chargingPriority: row.chargingPriority
      ? parseInt(row.chargingPriority)
      : null,
    concurrentTransaction: row.concurrentTransaction === 'true',
  }));
console.log(`Parsed ${rows.length} rows`);

const MUTATION = `
  mutation Insert($objects: [${TABLE}_insert_input!]!) {
    insert_${TABLE}(
      objects: $objects,
      on_conflict: { constraint: ${TABLE}_pkey, update_columns: [] }
    ) { affected_rows }
  }
`;

async function insertChunk(chunk: any[] | Record<string, any>[]) {
  if (!HASURA_URL || !ADMIN_SECRET)
    throw new Error('Missing HASURA_URL / ADMIN_SECRET');
  const res = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query: MUTATION, variables: { objects: chunk } }),
  });

  const json = await res.json();

  if (json.errors) {
    console.error('GraphQL errors:', json.errors);
    throw new Error(json.errors[0].message);
  }

  return json.data[`insert_${TABLE}`].affected_rows;
}

let total = 0;
for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
  const chunk = rows.slice(i, i + CHUNK_SIZE);
  const affected = await insertChunk(chunk);
  total += affected;
  console.log(`[${i + chunk.length}/${rows.length}] Inserted ${affected} rows`);
}

console.log(`Done. Total inserted: ${total}`);
