// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// this script is used to invalidate all tokens for a partner
// (by setting the valid flag to false) this will prevent the partner from using the tokens
// if the partner pull tokens from us and tokens is valid in DB, they will still retrieve it
// if you want pull to fail, you need to delete some mandatatory fields in additionalInfo (not used in citrine core like issuer)

import { GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY } from '@citrineos/ocpi-base';
import { TokensMapper } from '@citrineos/ocpi-base/src/mapper/TokensMapper.js';
import type { Endpoint } from '@zetra/citrineos-base';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

const TOKENS_RECEIVER = 'tokens_RECEIVER' as const;

const HASURA_URL = process.env.HASURA_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

const OUR_COUNTRY_CODE = process.env.OUR_COUNTRY_CODE;
const OUR_PARTY_ID = process.env.OUR_PARTY_ID;

const PARTNER_COUNTRY_CODE = process.env.PARTNER_COUNTRY_CODE;
const PARTNER_PARTY_ID = process.env.PARTNER_PARTY_ID;

const LIMIT = Number(process.env.LIMIT ?? 1);

if (!HASURA_URL || !ADMIN_SECRET)
  throw new Error('Missing HASURA_URL / HASURA_ADMIN_SECRET');
if (!OUR_COUNTRY_CODE || !OUR_PARTY_ID)
  throw new Error('Missing OUR_COUNTRY_CODE / OUR_PARTY_ID');
if (!PARTNER_COUNTRY_CODE || !PARTNER_PARTY_ID)
  throw new Error(
    'Missing PARTNER_TOKENS_RECEIVER_BASE_URL / PARTNER_OCPI_TOKEN',
  );

async function gql(query: string, variables: Record<string, any> = {}) {
  if (!ADMIN_SECRET) throw new Error('Missing ADMIN_SECRET');
  const res = await fetch(HASURA_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length)
    throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

async function getPartnerInfo() {
  const data = await gql(GET_TENANT_PARTNER_BY_OUR_AND_PARTNER_IDENTITY, {
    ourCountryCode: OUR_COUNTRY_CODE,
    ourPartyId: OUR_PARTY_ID,
    partnerCountryCode: PARTNER_COUNTRY_CODE,
    partnerPartyId: PARTNER_PARTY_ID,
  });
  return data.TenantPartners[0];
}

function getTokensReceiverUrl(endpoints: Endpoint[] | undefined): string {
  const url = endpoints?.find((e) => e.identifier === TOKENS_RECEIVER)?.url;
  if (!url) throw new Error('Partner has no tokens_RECEIVER endpoint');
  return url;
}
async function putTokenToPartner(
  token: any,
  url: string,
  authorizationToken: string,
) {
  const authorizationTokenB64 = Buffer.from(
    authorizationToken,
    'utf8',
  ).toString('base64');
  if (!OUR_COUNTRY_CODE || !OUR_PARTY_ID || !token.uid)
    throw new Error('Missing OUR_COUNTRY_CODE / OUR_PARTY_ID / token.uid');
  const formattedUrl = `${url}/${encodeURIComponent(OUR_COUNTRY_CODE)}/${encodeURIComponent(OUR_PARTY_ID)}/${encodeURIComponent(token.uid)}`;
  const res = await fetch(formattedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${authorizationTokenB64}`,
      'X-Request-ID': crypto.randomUUID(),
      'X-Correlation-ID': crypto.randomUUID(),
    },
    body: JSON.stringify(token),
  });

  const bodyText = await res.text();
  if (!res.ok) throw new Error(`Partner PUT failed ${res.status}: ${bodyText}`);
  return bodyText;
}

async function patchInvalidTokenToPartner(
  token: any,
  url: string,
  authorizationToken: string,
) {
  const authorizationTokenB64 = Buffer.from(
    authorizationToken,
    'utf8',
  ).toString('base64');
  if (!OUR_COUNTRY_CODE || !OUR_PARTY_ID || !token.uid)
    throw new Error('Missing OUR_COUNTRY_CODE / OUR_PARTY_ID / token.uid');
  const formattedUrl = `${url}/US/default/${encodeURIComponent(token.uid)}`;
  console.log('formattedUrl', formattedUrl);
  const res = await fetch(formattedUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${authorizationTokenB64}`,
      'X-Request-ID': crypto.randomUUID(),
      'X-Correlation-ID': crypto.randomUUID(),
    },
    body: JSON.stringify({
      valid: false,
      last_updated: token.last_updated ?? token.updatedAt,
    }),
  });

  const bodyText = await res.text();
  if (!res.ok) throw new Error(`Partner PUT failed ${res.status}: ${bodyText}`);
  return bodyText;
}

async function main() {
  let offset = 0;
  let pushed = 0;
  let failed = 0;

  const failures = [];

  let hasMore = true;
  while (hasMore) {
    const data = await gql(
      `
      query GetAuth($limit:Int!, $offset:Int!, $cc:String!, $pid:String!) {
        Authorizations(
          limit: $limit,
          offset: $offset,
          where: {
            tenantPartnerId: { _is_null: true },
            tenants: { tenant: { countryCode: { _eq: $cc }, partyId: { _eq: $pid } } }
          }
          order_by: { id: asc }
        ) {
          id
          idToken
          idTokenType
          status
          updatedAt
          additionalInfo
          realTimeAuth
          realTimeAuthLastAttempt
          realTimeAuthTimeout
          realTimeAuthUrl
          language1
          language2
          personalMessage
          concurrentTransaction
          createdAt
          tenants {
            tenantId
            tenant {
              countryCode
              partyId
            }
          }
        }
      }
      `,
      { limit: LIMIT, offset, cc: OUR_COUNTRY_CODE, pid: OUR_PARTY_ID },
    );

    // Get partner info
    const partnerInfo = await getPartnerInfo();
    const url = getTokensReceiverUrl(partnerInfo.partnerProfileOCPI.endpoints);
    const authorizationToken = partnerInfo.partnerProfileOCPI.credentials.token;
    const tokens = data.Authorizations;

    console.log('sending tokens to partner url :', url);
    if (!tokens.length) {
      hasMore = false;
      continue;
    }
    for (const token of tokens) {
      console.log('token', token);
      try {
        const partnerTenantId = partnerInfo.tenant.id;

        const tokenHasPartnerTenant = token.tenants?.some(
          (t: any) => t.tenantId === partnerTenantId,
        );

        if (!tokenHasPartnerTenant) {
          console.log('This token is not for this partner', token);
          continue;
        }
        const tokenDto = TokensMapper.toDtoSender(token, partnerInfo.tenant);
        console.log('tokenDto', tokenDto);
        await patchInvalidTokenToPartner(tokenDto, url, authorizationToken);
        pushed++;
      } catch (e) {
        console.error('Error pushing token to partner', e);
        failed++;
        failures.push({ id: token.id, err: String(e) });
      }
      // hasMore = false;
      // break;
    }
    offset += tokens.length;
    console.log({ offset, pushed, failed });
  }
  hasMore = false;
  console.log('Done', { pushed, failed });
}

await main();
