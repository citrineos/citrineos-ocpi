#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Sessions module OCPI 2.2.1 - test curl commands
#
# This script tests both the Receiver interface (eMSP receiving sessions from a CPO)
# and the Sender interface (CPO exposing its own sessions).
#
# Per OCPI 2.2.1, Sessions are owned by the CPO.
# Receiver endpoints use the CPO's country_code/party_id in the URL:
#   {sessions_endpoint_url}/{country_code}/{party_id}/{session_id}
#
# In this test:
#   - Our platform acts as eMSP: FR/ZET (the Tenant)
#   - Partner CPO: FR/108 (the TenantPartner)
#
# Prerequisites:
#   1. Server running on localhost:8085
#   2. DB migration applied: Sessions table (see migrations/20250730123509_*.ts)
#   3. Hasura metadata reloaded so GraphQL exposes the Sessions table.
#      From repo root:
#        npm run hasura:reload-metadata
#      Or: ./scripts/hasura-reload-metadata.sh
#
# Usage:
#   chmod +x sessions-test-curls.sh
#   ./sessions-test-curls.sh

OCPI_BASE="${OCPI_BASE:-http://localhost:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
SENDER_PREFIX="$OCPI_BASE/cpo/$OCPI_VERSION"
RECEIVER_PREFIX="$OCPI_BASE/emsp/$OCPI_VERSION"
SENDER_BASE_URL="$SENDER_PREFIX/sessions"
RECEIVER_BASE_URL="$RECEIVER_PREFIX/sessions"

AUTH_TOKEN="Token YmMzZjk0NjQtZjVmMS00MDdkLWI4OTQtODg0ODZlZmVkYmE2"

# OCPI headers: CPO partner FR/108 -> our eMSP FR/ZET
# OCPI_HEADERS=(
#   -H "Authorization: $AUTH_TOKEN"
#   -H "X-Request-ID: $(uuidgen 2>/dev/null || echo test-req-001)"
#   -H "X-Correlation-ID: $(uuidgen 2>/dev/null || echo test-corr-001)"
#   -H "OCPI-from-country-code: FR"
#   -H "OCPI-from-party-id: 108"
#   -H "OCPI-to-country-code: FR"
#   -H "OCPI-to-party-id: ZET"
# )

OCPI_HEADERS=(
  -H "Authorization: $AUTH_TOKEN"
  -H "X-Request-ID: $(uuidgen 2>/dev/null || echo test-req-001)"
  -H "X-Correlation-ID: $(uuidgen 2>/dev/null || echo test-corr-001)"
  -H "OCPI-from-country-code: FR"
  -H "OCPI-from-party-id: 108"
  -H "OCPI-to-country-code: FR"
  -H "OCPI-to-party-id: ZET"
)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

PASS=0
FAIL=0

separator() {
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}  $1${RESET}"
  echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
}

run_curl() {
  local expected="$1"
  shift

  local tmp
  tmp=$(mktemp)

  local http_code
  http_code=$(curl -sS -w "%{http_code}" -o "$tmp" "$@" 2>&1) || {
    echo -e "${RED}  Connection error:${RESET}"
    echo -e "${DIM}$(cat "$tmp")${RESET}"
    echo -e "${RED}  -> Is the server running on $RECEIVER_BASE_URL and $SENDER_BASE_URL ?${RESET}"
    FAIL=$((FAIL + 1))
    rm -f "$tmp"
    return
  }

  if [ "$http_code" = "$expected" ]; then
    echo -e "  ${GREEN}HTTP $http_code${RESET}  ${DIM}(expected $expected)${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}HTTP $http_code${RESET}  ${YELLOW}(expected $expected)${RESET}"
    FAIL=$((FAIL + 1))
  fi

  local body
  body=$(cat "$tmp")
  rm -f "$tmp"

  if [ -n "$body" ]; then
    echo ""
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  fi
}

# ===========================================================================
# PHASE 1 — CREATE (Receiver PUT)
# The CPO (FR/108) pushes sessions to our eMSP (FR/ZET).
# URL uses CPO's country_code/party_id per OCPI 2.2.1 spec.
# The session is stored with a tenantPartnerId linking it to FR/108.
# ===========================================================================

separator "1. PUT /sessions/FR/108/sess-001 — Create session 1 (ACTIVE charging session)"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/108/sess-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "108",
    "id": "sess-001",
    "start_date_time": "2024-06-15T10:00:00Z",
    "kwh": 5.2,
    "cdr_token": {
      "uid": "TOKEN-001",
      "type": "RFID",
      "contract_id": "FRZET-CONTRACT-001",
      "country_code": "FR",
      "party_id": "ZET"
    },
    "auth_method": "WHITELIST",
    "location_id": "LOC-001",
    "evse_uid": "FR*108*E001",
    "connector_id": "1",
    "currency": "EUR",
    "status": "ACTIVE",
    "last_updated": "2024-06-15T10:15:00Z"
  }'

separator "2. PUT /sessions/FR/108/sess-002 — Create session 2 (COMPLETED with charging periods)"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/108/sess-002" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "108",
    "id": "sess-002",
    "start_date_time": "2024-06-14T14:00:00Z",
    "end_date_time": "2024-06-14T15:30:00Z",
    "kwh": 22.4,
    "cdr_token": {
      "uid": "TOKEN-002",
      "type": "RFID",
      "contract_id": "FRZET-CONTRACT-002",
      "country_code": "FR",
      "party_id": "ZET"
    },
    "auth_method": "WHITELIST",
    "location_id": "LOC-002",
    "evse_uid": "FR*108*E002",
    "connector_id": "2",
    "currency": "EUR",
    "charging_periods": [
      {
        "start_date_time": "2024-06-14T14:00:00Z",
        "dimensions": [
          { "type": "ENERGY", "volume": 11.2 },
          { "type": "TIME", "volume": 0.5 }
        ],
        "tariff_id": "tariff-std-001"
      },
      {
        "start_date_time": "2024-06-14T14:30:00Z",
        "dimensions": [
          { "type": "ENERGY", "volume": 11.2 },
          { "type": "TIME", "volume": 0.5 }
        ],
        "tariff_id": "tariff-std-001"
      }
    ],
    "total_cost": {
      "excl_vat": 5.60
    },
    "status": "COMPLETED",
    "last_updated": "2024-06-14T15:30:00Z"
  }'

# ===========================================================================
# PHASE 2 — READ (Receiver GET)
# Retrieve sessions stored from partner CPO.
# ===========================================================================

separator "3. GET /sessions/FR/108/sess-001 — Retrieve session 1"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/108/sess-001" \
  "${OCPI_HEADERS[@]}"

separator "4. GET /sessions/FR/108/sess-002 — Retrieve session 2"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/108/sess-002" \
  "${OCPI_HEADERS[@]}"

separator "5. GET /sessions/FR/108/nonexistent — Non-existent session (expect 404)"
run_curl 404 \
  "$RECEIVER_BASE_URL/FR/108/nonexistent" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 3 — UPDATE (Receiver PATCH + Receiver PUT replace)
# ===========================================================================

separator "6. PATCH /sessions/FR/108/sess-001 — Update kwh and add charging period"
run_curl 200 \
  -X PATCH "$RECEIVER_BASE_URL/FR/108/sess-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "kwh": 12.8,
    "charging_periods": [
      {
        "start_date_time": "2024-06-15T10:00:00Z",
        "dimensions": [
          { "type": "ENERGY", "volume": 12.8 },
          { "type": "TIME", "volume": 0.5 }
        ],
        "tariff_id": "tariff-std-001"
      }
    ],
    "last_updated": "2024-06-15T10:30:00Z"
  }'

separator "7. GET /sessions/FR/108/sess-001 — Verify the patch"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/108/sess-001" \
  "${OCPI_HEADERS[@]}"

separator "8. PUT /sessions/FR/108/sess-001 — Replace session 1 (mark COMPLETED)"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/108/sess-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "108",
    "id": "sess-001",
    "start_date_time": "2024-06-15T10:00:00Z",
    "end_date_time": "2024-06-15T11:00:00Z",
    "kwh": 25.0,
    "cdr_token": {
      "uid": "TOKEN-001",
      "type": "RFID",
      "contract_id": "FRZET-CONTRACT-001",
      "country_code": "FR",
      "party_id": "ZET"
    },
    "auth_method": "WHITELIST",
    "location_id": "LOC-001",
    "evse_uid": "FR*108*E001",
    "connector_id": "1",
    "currency": "EUR",
    "charging_periods": [
      {
        "start_date_time": "2024-06-15T10:00:00Z",
        "dimensions": [
          { "type": "ENERGY", "volume": 25.0 },
          { "type": "TIME", "volume": 1.0 }
        ],
        "tariff_id": "tariff-std-001"
      }
    ],
    "total_cost": {
      "excl_vat": 6.25
    },
    "status": "COMPLETED",
    "last_updated": "2024-06-15T11:00:00Z"
  }'

separator "9. GET /sessions/FR/108/sess-001 — Verify the replacement"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/108/sess-001" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 4 — SENDER GET (paginated list of our own sessions from Transactions)
#
# The Sender GET returns our own sessions (from the Transactions table),
# filtered by the requesting eMSP partner.
# This list will be empty unless there are actual Transactions in the DB
# with matching Tenant and Authorization.TenantPartner.
# ===========================================================================

separator "10. GET /sessions — Sender paginated list"
run_curl 200 \
  "$SENDER_BASE_URL" \
  "${OCPI_HEADERS[@]}"

separator "11. GET /sessions?limit=1&offset=0 — Pagination (page 1)"
run_curl 200 \
  "$SENDER_BASE_URL?limit=1&offset=0" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 5 — EDGE CASES
# ===========================================================================

separator "12. PATCH /sessions/FR/108/nonexistent — Patch non-existent (expect error)"
run_curl 404 \
  -X PATCH "$RECEIVER_BASE_URL/FR/108/nonexistent" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "kwh": 10,
    "last_updated": "2024-06-15T12:00:00Z"
  }'

# ===========================================================================
# Summary
# ===========================================================================

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  RESULTS${RESET}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}PASS: $PASS${RESET}   ${RED}FAIL: $FAIL${RESET}   TOTAL: $((PASS + FAIL))"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
