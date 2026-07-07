// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
//
// Fill missing connector fields required for OCPI location mapping:
//   format null/empty        → Cable
//   type null/empty          → IEC62196T2
//   powerType null/empty     → AC3Phase (maps to OCPI AC_3_PHASE)
//   maximumAmperage null     → 32
//   maximumVoltage null      → 230
//   maximumPowerWatts null   → 22000
//
// For connectors on locations without owner tenant partner, create an own
// ConnectorTariffs row linking to tariff id 165 (tenantPartnerId null).
//
// Usage (from citrineos-ocpi root):
//   npx tsx ./Server/scripts/fill-missing-data-connector.ts
//
// Optional env (Server/scripts/.env):

import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const HASURA_URL = process.env.HASURA_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 200);

const DEFAULT_FORMAT = 'Cable';
const DEFAULT_TYPE = 'IEC62196T2';
const DEFAULT_POWER_TYPE = process.env.DEFAULT_POWER_TYPE ?? 'AC3Phase';
const DEFAULT_MAXIMUM_AMPERAGE = Number(
  process.env.DEFAULT_MAXIMUM_AMPERAGE ?? 32,
);
const DEFAULT_MAXIMUM_VOLTAGE = Number(
  process.env.DEFAULT_MAXIMUM_VOLTAGE ?? 230,
);
const DEFAULT_MAXIMUM_POWER_WATTS = Number(
  process.env.DEFAULT_MAXIMUM_POWER_WATTS ?? 22000,
);
const DEFAULT_TARIFF_ID = Number(process.env.DEFAULT_TARIFF_ID ?? 165);
const DEFAULT_TARIFF_OCPI_ID =
  process.env.DEFAULT_TARIFF_OCPI_ID ?? 'TARIFF-SEED-030-KWH';

const OWN_CONNECTOR_WHERE = {
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

async function countMissing(): Promise<{
  missingFormat: number;
  missingType: number;
  missingPowerType: number;
  missingMaximumAmperage: number;
  missingMaximumVoltage: number;
  missingMaximumPowerWatts: number;
}> {
  const result = await gql(
    `
    query CountMissingConnectorFields {
      missingFormat: Connectors_aggregate(
        where: {
          _or: [
            { format: { _is_null: true } }
            { format: { _eq: "" } }
          ]
        }
      ) {
        aggregate { count }
      }
      missingType: Connectors_aggregate(
        where: {
          _or: [
            { type: { _is_null: true } }
            { type: { _eq: "" } }
          ]
        }
      ) {
        aggregate { count }
      }
      missingPowerType: Connectors_aggregate(
        where: {
          _or: [
            { powerType: { _is_null: true } }
            { powerType: { _eq: "" } }
          ]
        }
      ) {
        aggregate { count }
      }
      missingMaximumAmperage: Connectors_aggregate(
        where: { maximumAmperage: { _is_null: true } }
      ) {
        aggregate { count }
      }
      missingMaximumVoltage: Connectors_aggregate(
        where: { maximumVoltage: { _is_null: true } }
      ) {
        aggregate { count }
      }
      missingMaximumPowerWatts: Connectors_aggregate(
        where: { maximumPowerWatts: { _is_null: true } }
      ) {
        aggregate { count }
      }
    }
  `,
  );

  const count = (key: string) =>
    ((result[key] as { aggregate?: { count?: number } })?.aggregate?.count ??
      0) as number;

  return {
    missingFormat: count('missingFormat'),
    missingType: count('missingType'),
    missingPowerType: count('missingPowerType'),
    missingMaximumAmperage: count('missingMaximumAmperage'),
    missingMaximumVoltage: count('missingMaximumVoltage'),
    missingMaximumPowerWatts: count('missingMaximumPowerWatts'),
  };
}

async function updateMissingFormat(): Promise<number> {
  const data = await gql(
    `
    mutation UpdateMissingConnectorFormat($format: String!) {
      update_Connectors(
        where: {
          _or: [
            { format: { _is_null: true } }
            { format: { _eq: "" } }
          ]
        }
        _set: { format: $format }
      ) {
        affected_rows
      }
    }
  `,
    { format: DEFAULT_FORMAT },
  );

  return (
    (data.update_Connectors as { affected_rows?: number })?.affected_rows ?? 0
  );
}

async function updateMissingType(): Promise<number> {
  const data = await gql(
    `
    mutation UpdateMissingConnectorType($type: String!) {
      update_Connectors(
        where: {
          _or: [
            { type: { _is_null: true } }
            { type: { _eq: "" } }
          ]
        }
        _set: { type: $type }
      ) {
        affected_rows
      }
    }
  `,
    { type: DEFAULT_TYPE },
  );

  return (
    (data.update_Connectors as { affected_rows?: number })?.affected_rows ?? 0
  );
}

async function updateMissingPowerType(): Promise<number> {
  const data = await gql(
    `
    mutation UpdateMissingConnectorPowerType($powerType: String!) {
      update_Connectors(
        where: {
          _or: [
            { powerType: { _is_null: true } }
            { powerType: { _eq: "" } }
          ]
        }
        _set: { powerType: $powerType }
      ) {
        affected_rows
      }
    }
  `,
    { powerType: DEFAULT_POWER_TYPE },
  );

  return (
    (data.update_Connectors as { affected_rows?: number })?.affected_rows ?? 0
  );
}

async function updateMissingMaximumAmperage(): Promise<number> {
  const data = await gql(
    `
    mutation UpdateMissingConnectorMaximumAmperage($maximumAmperage: Int!) {
      update_Connectors(
        where: { maximumAmperage: { _is_null: true } }
        _set: { maximumAmperage: $maximumAmperage }
      ) {
        affected_rows
      }
    }
  `,
    { maximumAmperage: DEFAULT_MAXIMUM_AMPERAGE },
  );

  return (
    (data.update_Connectors as { affected_rows?: number })?.affected_rows ?? 0
  );
}

async function updateMissingMaximumVoltage(): Promise<number> {
  const data = await gql(
    `
    mutation UpdateMissingConnectorMaximumVoltage($maximumVoltage: Int!) {
      update_Connectors(
        where: { maximumVoltage: { _is_null: true } }
        _set: { maximumVoltage: $maximumVoltage }
      ) {
        affected_rows
      }
    }
  `,
    { maximumVoltage: DEFAULT_MAXIMUM_VOLTAGE },
  );

  return (
    (data.update_Connectors as { affected_rows?: number })?.affected_rows ?? 0
  );
}

async function updateMissingMaximumPowerWatts(): Promise<number> {
  const data = await gql(
    `
    mutation UpdateMissingConnectorMaximumPowerWatts($maximumPowerWatts: Int!) {
      update_Connectors(
        where: { maximumPowerWatts: { _is_null: true } }
        _set: { maximumPowerWatts: $maximumPowerWatts }
      ) {
        affected_rows
      }
    }
  `,
    { maximumPowerWatts: DEFAULT_MAXIMUM_POWER_WATTS },
  );

  return (
    (data.update_Connectors as { affected_rows?: number })?.affected_rows ?? 0
  );
}

type ConnectorTariffRow = {
  id: number;
  tariffId: number;
  tariffOcpiId: string;
};

type ConnectorRow = {
  id: number;
  ocpiId: string | null;
  tenantId: number;
  ConnectorTariffs: ConnectorTariffRow[];
};

async function resolveTariff(
  tariffId: number,
  fallbackOcpiId: string,
): Promise<{ id: number; ocpiTariffId: string }> {
  const data = await gql(
    `
    query FindTariffById($id: Int!) {
      Tariffs_by_pk(id: $id) {
        id
        ocpiTariffId
      }
    }
  `,
    { id: tariffId },
  );

  const tariff = data.Tariffs_by_pk as {
    id: number;
    ocpiTariffId: string | null;
  } | null;

  if (!tariff) {
    throw new Error(`Tariff not found: id=${tariffId}`);
  }

  return {
    id: tariff.id,
    ocpiTariffId: tariff.ocpiTariffId ?? fallbackOcpiId,
  };
}

async function countOwnConnectors(): Promise<number> {
  const result = await gql(
    `
    query CountOwnConnectors($where: Connectors_bool_exp!) {
      Connectors_aggregate(where: $where) {
        aggregate { count }
      }
    }
  `,
    { where: OWN_CONNECTOR_WHERE },
  );

  return ((result.Connectors_aggregate as { aggregate?: { count?: number } })
    ?.aggregate?.count ?? 0) as number;
}

async function listOwnConnectorSample(limit = 20): Promise<ConnectorRow[]> {
  const data = await gql(
    `
    query ListOwnConnectors($where: Connectors_bool_exp!, $limit: Int!) {
      Connectors(where: $where, limit: $limit, order_by: { id: asc }) {
        id
        ocpiId
        tenantId
        ConnectorTariffs(where: { tenantPartnerId: { _is_null: true } }) {
          id
          tariffId
          tariffOcpiId
        }
      }
    }
  `,
    { where: OWN_CONNECTOR_WHERE, limit },
  );

  return (data.Connectors ?? []) as ConnectorRow[];
}

async function fetchOwnConnectorBatch(offset: number): Promise<ConnectorRow[]> {
  const data = await gql(
    `
    query FetchOwnConnectors(
      $where: Connectors_bool_exp!
      $limit: Int!
      $offset: Int!
    ) {
      Connectors(
        where: $where
        limit: $limit
        offset: $offset
        order_by: { id: asc }
      ) {
        id
        ocpiId
        tenantId
        ConnectorTariffs(where: { tenantPartnerId: { _is_null: true } }) {
          id
          tariffId
          tariffOcpiId
        }
      }
    }
  `,
    { where: OWN_CONNECTOR_WHERE, limit: BATCH_SIZE, offset },
  );

  return (data.Connectors ?? []) as ConnectorRow[];
}

function connectorOcpiId(connector: ConnectorRow): string {
  return connector.ocpiId ?? connector.id.toString();
}

async function insertConnectorTariff(
  connector: ConnectorRow,
  tariffId: number,
  tariffOcpiId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await gql(
    `
    mutation InsertConnectorTariff($object: ConnectorTariffs_insert_input!) {
      insert_ConnectorTariffs_one(object: $object) {
        id
      }
    }
  `,
    {
      object: {
        connectorId: connector.id,
        connectorOcpiId: connectorOcpiId(connector),
        tariffId,
        tariffOcpiId,
        tenantPartnerId: null,
        tenantId: connector.tenantId,
        createdAt: now,
        updatedAt: now,
      },
    },
  );
}

async function assignOwnConnectorTariffs(): Promise<void> {
  if (Number.isNaN(DEFAULT_TARIFF_ID)) {
    throw new Error('DEFAULT_TARIFF_ID must be a number');
  }

  const tariff = await resolveTariff(DEFAULT_TARIFF_ID, DEFAULT_TARIFF_OCPI_ID);
  const total = await countOwnConnectors();

  console.log(
    `Own connectors (location without owner tenant partner): ${total}`,
  );
  console.log(
    `Target tariff: id=${tariff.id}, ocpiTariffId=${tariff.ocpiTariffId}`,
  );

  if (total === 0) {
    return;
  }

  const sampleBefore = await listOwnConnectorSample();
  console.log(
    'Tariff sample (before):',
    sampleBefore.map((c) => ({
      id: c.id,
      tariffs: c.ConnectorTariffs.map((t) => t.tariffOcpiId),
    })),
  );

  let created = 0;
  let skipped = 0;
  let offset = 0;

  while (offset < total) {
    const batch = await fetchOwnConnectorBatch(offset);
    if (batch.length === 0) {
      break;
    }

    for (const connector of batch) {
      const hasTarget = connector.ConnectorTariffs.some(
        (t) => t.tariffId === tariff.id,
      );

      if (hasTarget) {
        skipped++;
        continue;
      }

      await insertConnectorTariff(connector, tariff.id, tariff.ocpiTariffId);
      created++;
    }

    offset += batch.length;
    console.log(`Tariff progress: ${offset}/${total} processed`);
  }

  const sampleAfter = await listOwnConnectorSample();
  console.log(
    'Tariff sample (after):',
    sampleAfter.map((c) => ({
      id: c.id,
      tariffs: c.ConnectorTariffs.map((t) => t.tariffOcpiId),
    })),
  );

  console.log(
    `Tariffs: created ${created}, skipped (already linked) ${skipped}`,
  );
}

async function run(): Promise<void> {
  for (const [name, value] of [
    ['DEFAULT_MAXIMUM_AMPERAGE', DEFAULT_MAXIMUM_AMPERAGE],
    ['DEFAULT_MAXIMUM_VOLTAGE', DEFAULT_MAXIMUM_VOLTAGE],
    ['DEFAULT_MAXIMUM_POWER_WATTS', DEFAULT_MAXIMUM_POWER_WATTS],
  ] as const) {
    if (Number.isNaN(value)) {
      throw new Error(`${name} must be a number`);
    }
  }

  const before = await countMissing();
  console.log('Before:', before);

  const formatUpdated = await updateMissingFormat();
  console.log(`Updated format → ${DEFAULT_FORMAT}: ${formatUpdated} row(s)`);

  const typeUpdated = await updateMissingType();
  console.log(`Updated type → ${DEFAULT_TYPE}: ${typeUpdated} row(s)`);

  const powerTypeUpdated = await updateMissingPowerType();
  console.log(
    `Updated powerType → ${DEFAULT_POWER_TYPE}: ${powerTypeUpdated} row(s)`,
  );

  const amperageUpdated = await updateMissingMaximumAmperage();
  console.log(
    `Updated maximumAmperage → ${DEFAULT_MAXIMUM_AMPERAGE}: ${amperageUpdated} row(s)`,
  );

  const voltageUpdated = await updateMissingMaximumVoltage();
  console.log(
    `Updated maximumVoltage → ${DEFAULT_MAXIMUM_VOLTAGE}: ${voltageUpdated} row(s)`,
  );

  const powerWattsUpdated = await updateMissingMaximumPowerWatts();
  console.log(
    `Updated maximumPowerWatts → ${DEFAULT_MAXIMUM_POWER_WATTS}: ${powerWattsUpdated} row(s)`,
  );

  const after = await countMissing();
  console.log('After:', after);

  await assignOwnConnectorTariffs();

  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
