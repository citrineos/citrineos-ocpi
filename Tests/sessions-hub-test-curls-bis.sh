#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Sessions module OCPI 2.2.1 — Hub→eMSP leg test
#
# Topology:
#   Hub:         FR/107  (the hub forwarding on behalf of CPOs)
#   eMSP Tenant: FR/ZET  (our platform, receiving sessions from the hub)
#   CPO-A:       FR/CPO  (identified only by the URL path)
#   CPO-B:       DE/EVP  (identified only by the URL path)
#
# What is under test:
#   The hub has already routed the CPO's push and calls our eMSP receiver.
#   On that forwarded request the hub identifies itself as the sender:
#     OCPI-from-country-code: FR
#     OCPI-from-party-id:     107
#     OCPI-to-country-code:   FR
#     OCPI-to-party-id:       ZET
#   These headers are IDENTICAL for every call in this script.
#
#   The originating CPO is NOT in the headers — it is encoded in the URL:
#     PUT {emsp_url}/sessions/{country_code}/{party_id}/{session_id}
#   Our eMSP must namespace sessions by (country_code, party_id, session_id)
#   from the URL, not from the routing headers.
#
#   Key invariant: FR/CPO and DE/EVP both use session id "sess-001".
#   The eMSP must store two separate records and never conflate them.
#
# OCPI 2.2.1 references:
#   §3.1.3  Hub routing headers
#   §9.2.1  Receiver PUT   {url}/{country_code}/{party_id}/{session_id}
#   §9.2.2  Receiver PATCH {url}/{country_code}/{party_id}/{session_id}
#   §9.2.3  Receiver GET   {url}/{country_code}/{party_id}/{session_id}
#
# Prerequisites:
#   1. Server running on localhost:8085
#   2. DB migration applied (Sessions table)
#   3. Hasura metadata reloaded: npm run hasura:reload-metadata
#
# Usage:
#   chmod +x sessions-hub-test-curls.sh
#   ./sessions-hub-test-curls.sh

OCPI_BASE="${OCPI_BASE:-http://localhost:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
RECEIVER_BASE_URL="$OCPI_BASE/emsp/$OCPI_VERSION/sessions"

AUTH_TOKEN="Token YmEwMDE3NTEtZTlhYy00NGE5LTkzMjItMjRjNWZkYTZlNzM0"

OCPI_HEADERS=(
  -H "Authorization: $AUTH_TOKEN"
  -H "X-Request-ID: $(uuidgen 2>/dev/null || echo test-req-hub-001)"
  -H "X-Correlation-ID: $(uuidgen 2>/dev/null || echo test-corr-hub-001)"
  -H "OCPI-from-country-code: FR"
  -H "OCPI-from-party-id: 107"
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
  local label="$1"
  local expected="$2"
  shift 2

  echo -e "${DIM}  → $label${RESET}"

  local tmp
  tmp=$(mktemp)

  local http_code
  http_code=$(curl -sS -w "%{http_code}" -o "$tmp" "$@" 2>&1) || {
    echo -e "${RED}  Connection error — is the server up at $RECEIVER_BASE_URL ?${RESET}"
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
  echo ""
}

# ===========================================================================
# PHASE 1 — CREATE (Receiver PUT)
#
# §9.2.1: PUT {sessions_url}/{country_code}/{party_id}/{session_id}
# The country_code/party_id in the URL is the originating CPO's identity.
# The hub forwards both CPOs' sessions with identical routing headers;
# only the URL path distinguishes them.
#
# Invariant: FR/CPO and DE/EVP both send id="sess-001".
# The eMSP must create two independent records.
# ===========================================================================

separator "1a. PUT /sessions/FR/CPO/sess-001 — Hub forwards CPO-A sess-001 (ACTIVE, kwh=5.2)"
run_curl "CPO-A sess-001 created" 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/CPO/sess-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "CPO",
    "id": "sess-001",
    "start_date_time": "2024-06-15T10:00:00Z",
    "kwh": 5.2,
    "cdr_token": {
      "uid": "TOKEN-CPO-001",
      "type": "RFID",
      "contract_id": "FRZET-CONTRACT-001",
      "country_code": "FR",
      "party_id": "ZET"
    },
    "auth_method": "WHITELIST",
    "location_id": "LOC-CPO-001",
    "evse_uid": "FR*CPO*E001",
    "connector_id": "1",
    "currency": "EUR",
    "status": "ACTIVE",
    "last_updated": "2024-06-15T10:15:00Z"
  }'

# Same session id "sess-001" — different CPO namespace in the URL.
# Must NOT overwrite or collide with CPO-A's record above.
separator "1b. PUT /sessions/DE/EVP/sess-001 — Hub forwards CPO-B sess-001 (ACTIVE, kwh=3.1)"
run_curl "CPO-B sess-001 created (same id, different namespace)" 200 \
  -X PUT "$RECEIVER_BASE_URL/DE/EVP/sess-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "DE",
    "party_id": "EVP",
    "id": "sess-001",
    "start_date_time": "2024-06-15T09:00:00Z",
    "kwh": 3.1,
    "cdr_token": {
      "uid": "TOKEN-EVP-001",
      "type": "RFID",
      "contract_id": "FRZET-CONTRACT-011",
      "country_code": "FR",
      "party_id": "ZET"
    },
    "auth_method": "WHITELIST",
    "location_id": "LOC-EVP-001",
    "evse_uid": "DE*EVP*E001",
    "connector_id": "1",
    "currency": "EUR",
    "status": "ACTIVE",
    "last_updated": "2024-06-15T09:15:00Z"
  }'

separator "1c. PUT /sessions/FR/CPO/sess-002 — Hub forwards CPO-A sess-002 (COMPLETED)"
run_curl "CPO-A sess-002 created" 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/CPO/sess-002" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "CPO",
    "id": "sess-002",
    "start_date_time": "2024-06-14T14:00:00Z",
    "end_date_time": "2024-06-14T15:30:00Z",
    "kwh": 22.4,
    "cdr_token": {
      "uid": "TOKEN-CPO-002",
      "type": "RFID",
      "contract_id": "FRZET-CONTRACT-002",
      "country_code": "FR",
      "party_id": "ZET"
    },
    "auth_method": "WHITELIST",
    "location_id": "LOC-CPO-002",
    "evse_uid": "FR*CPO*E002",
    "connector_id": "2",
    "currency": "EUR",
    "charging_periods": [
      {
        "start_date_time": "2024-06-14T14:00:00Z",
        "dimensions": [
          { "type": "ENERGY", "volume": 11.2 },
          { "type": "TIME",   "volume": 0.5  }
        ],
        "tariff_id": "tariff-std-001"
      },
      {
        "start_date_time": "2024-06-14T14:30:00Z",
        "dimensions": [
          { "type": "ENERGY", "volume": 11.2 },
          { "type": "TIME",   "volume": 0.5  }
        ],
        "tariff_id": "tariff-std-001"
      }
    ],
    "total_cost": { "excl_vat": 5.60 },
    "status": "COMPLETED",
    "last_updated": "2024-06-14T15:30:00Z"
  }'

separator "1d. PUT /sessions/DE/EVP/sess-002 — Hub forwards CPO-B sess-002 (COMPLETED)"
run_curl "CPO-B sess-002 created" 200 \
  -X PUT "$RECEIVER_BASE_URL/DE/EVP/sess-002" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "DE",
    "party_id": "EVP",
    "id": "sess-002",
    "start_date_time": "2024-06-14T08:00:00Z",
    "end_date_time": "2024-06-14T09:00:00Z",
    "kwh": 15.0,
    "cdr_token": {
      "uid": "TOKEN-EVP-002",
      "type": "RFID",
      "contract_id": "FRZET-CONTRACT-012",
      "country_code": "FR",
      "party_id": "ZET"
    },
    "auth_method": "WHITELIST",
    "location_id": "LOC-EVP-002",
    "evse_uid": "DE*EVP*E002",
    "connector_id": "1",
    "currency": "EUR",
    "total_cost": { "excl_vat": 3.75 },
    "status": "COMPLETED",
    "last_updated": "2024-06-14T09:00:00Z"
  }'

# ===========================================================================
# PHASE 2 — READ (Receiver GET)
#
# §9.2.3: GET {sessions_url}/{country_code}/{party_id}/{session_id}
#
# Critical isolation check: both GETs carry identical hub headers.
# The only difference is the URL. Responses MUST differ:
#   FR/CPO/sess-001 → kwh=5.2, evse=FR*CPO*E001, location=LOC-CPO-001
#   DE/EVP/sess-001 → kwh=3.1, evse=DE*EVP*E001, location=LOC-EVP-001
# ===========================================================================

separator "2a. GET /sessions/FR/CPO/sess-001 — Retrieve CPO-A (expect kwh=5.2)"
run_curl "CPO-A sess-001 retrieved" 200 \
  "$RECEIVER_BASE_URL/FR/CPO/sess-001" \
  "${OCPI_HEADERS[@]}"

separator "2b. GET /sessions/DE/EVP/sess-001 — Retrieve CPO-B (same id, expect kwh=3.1)"
run_curl "CPO-B sess-001 retrieved — must differ from CPO-A" 200 \
  "$RECEIVER_BASE_URL/DE/EVP/sess-001" \
  "${OCPI_HEADERS[@]}"

separator "2c. GET /sessions/FR/CPO/sess-002 — Retrieve CPO-A sess-002"
run_curl "CPO-A sess-002 retrieved" 200 \
  "$RECEIVER_BASE_URL/FR/CPO/sess-002" \
  "${OCPI_HEADERS[@]}"

separator "2d. GET /sessions/DE/EVP/sess-002 — Retrieve CPO-B sess-002"
run_curl "CPO-B sess-002 retrieved" 200 \
  "$RECEIVER_BASE_URL/DE/EVP/sess-002" \
  "${OCPI_HEADERS[@]}"

separator "2e. GET /sessions/FR/CPO/nonexistent — Not found (expect 404)"
run_curl "CPO-A non-existent session" 404 \
  "$RECEIVER_BASE_URL/FR/CPO/nonexistent" \
  "${OCPI_HEADERS[@]}"

separator "2f. GET /sessions/DE/EVP/nonexistent — Not found (expect 404)"
run_curl "CPO-B non-existent session" 404 \
  "$RECEIVER_BASE_URL/DE/EVP/nonexistent" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 3 — UPDATE (Receiver PATCH)
#
# §9.2.2: PATCH {sessions_url}/{country_code}/{party_id}/{session_id}
#
# Patch CPO-A's sess-001, then immediately verify CPO-B's sess-001 is
# untouched — the strongest possible isolation assertion.
# ===========================================================================

separator "3a. PATCH /sessions/FR/CPO/sess-001 — Update CPO-A kwh to 12.8"
run_curl "CPO-A sess-001 patched" 200 \
  -X PATCH "$RECEIVER_BASE_URL/FR/CPO/sess-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "kwh": 12.8,
    "charging_periods": [
      {
        "start_date_time": "2024-06-15T10:00:00Z",
        "dimensions": [
          { "type": "ENERGY", "volume": 12.8 },
          { "type": "TIME",   "volume": 0.5  }
        ],
        "tariff_id": "tariff-std-001"
      }
    ],
    "last_updated": "2024-06-15T10:30:00Z"
  }'

separator "3b. GET /sessions/FR/CPO/sess-001 — Verify CPO-A patch (kwh must be 12.8)"
run_curl "CPO-A sess-001 patch verified" 200 \
  "$RECEIVER_BASE_URL/FR/CPO/sess-001" \
  "${OCPI_HEADERS[@]}"

# The core hub isolation assertion: patching CPO-A must not touch CPO-B
separator "3c. GET /sessions/DE/EVP/sess-001 — CPO-B must be untouched (kwh must still be 3.1)"
run_curl "CPO-B sess-001 unaffected by CPO-A patch" 200 \
  "$RECEIVER_BASE_URL/DE/EVP/sess-001" \
  "${OCPI_HEADERS[@]}"

separator "3d. PATCH /sessions/DE/EVP/sess-001 — Update CPO-B kwh to 8.7 independently"
run_curl "CPO-B sess-001 patched independently" 200 \
  -X PATCH "$RECEIVER_BASE_URL/DE/EVP/sess-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "kwh": 8.7,
    "last_updated": "2024-06-15T09:45:00Z"
  }'

separator "3e. GET /sessions/DE/EVP/sess-001 — Verify CPO-B patch (kwh must be 8.7)"
run_curl "CPO-B sess-001 patch verified" 200 \
  "$RECEIVER_BASE_URL/DE/EVP/sess-001" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 4 — REPLACE (Receiver PUT replace)
# ===========================================================================

separator "4a. PUT /sessions/FR/CPO/sess-001 — Replace CPO-A sess-001 (COMPLETED, kwh=25.0)"
run_curl "CPO-A sess-001 replaced" 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/CPO/sess-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "CPO",
    "id": "sess-001",
    "start_date_time": "2024-06-15T10:00:00Z",
    "end_date_time": "2024-06-15T11:00:00Z",
    "kwh": 25.0,
    "cdr_token": {
      "uid": "TOKEN-CPO-001",
      "type": "RFID",
      "contract_id": "FRZET-CONTRACT-001",
      "country_code": "FR",
      "party_id": "ZET"
    },
    "auth_method": "WHITELIST",
    "location_id": "LOC-CPO-001",
    "evse_uid": "FR*CPO*E001",
    "connector_id": "1",
    "currency": "EUR",
    "charging_periods": [
      {
        "start_date_time": "2024-06-15T10:00:00Z",
        "dimensions": [
          { "type": "ENERGY", "volume": 25.0 },
          { "type": "TIME",   "volume": 1.0  }
        ],
        "tariff_id": "tariff-std-001"
      }
    ],
    "total_cost": { "excl_vat": 6.25 },
    "status": "COMPLETED",
    "last_updated": "2024-06-15T11:00:00Z"
  }'

separator "4b. GET /sessions/FR/CPO/sess-001 — Verify replacement (expect COMPLETED, kwh=25.0)"
run_curl "CPO-A sess-001 replacement verified" 200 \
  "$RECEIVER_BASE_URL/FR/CPO/sess-001" \
  "${OCPI_HEADERS[@]}"

# CPO-B's sess-001 must remain at kwh=8.7, status=ACTIVE from phase 3
separator "4c. GET /sessions/DE/EVP/sess-001 — CPO-B unaffected by CPO-A replace (kwh must be 8.7)"
run_curl "CPO-B sess-001 unaffected by CPO-A replace" 200 \
  "$RECEIVER_BASE_URL/DE/EVP/sess-001" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 5 — EDGE CASES
# ===========================================================================

separator "5a. PATCH /sessions/FR/CPO/nonexistent — Non-existent CPO-A (expect 404)"
run_curl "Patch non-existent CPO-A session" 404 \
  -X PATCH "$RECEIVER_BASE_URL/FR/CPO/nonexistent" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "kwh": 10, "last_updated": "2024-06-15T12:00:00Z" }'

separator "5b. PATCH /sessions/DE/EVP/nonexistent — Non-existent CPO-B (expect 404)"
run_curl "Patch non-existent CPO-B session" 404 \
  -X PATCH "$RECEIVER_BASE_URL/DE/EVP/nonexistent" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "kwh": 10, "last_updated": "2024-06-15T12:00:00Z" }'

# Body country_code/party_id disagrees with URL country_code/party_id.
# Per §9.2.1 the URL is authoritative. The session must be stored under
# DE/EVP (from the URL), not FR/CPO (from the body).
separator "5c. PUT /sessions/DE/EVP/sess-099 — Body says FR/CPO, URL says DE/EVP (URL wins)"
run_curl "Body/URL mismatch stored under URL namespace" 200 \
  -X PUT "$RECEIVER_BASE_URL/DE/EVP/sess-099" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "CPO",
    "id": "sess-099",
    "start_date_time": "2024-06-16T08:00:00Z",
    "kwh": 1.0,
    "cdr_token": {
      "uid": "TOKEN-EVP-099",
      "type": "RFID",
      "contract_id": "FRZET-CONTRACT-099",
      "country_code": "FR",
      "party_id": "ZET"
    },
    "auth_method": "WHITELIST",
    "location_id": "LOC-EVP-099",
    "evse_uid": "DE*EVP*E099",
    "connector_id": "1",
    "currency": "EUR",
    "status": "ACTIVE",
    "last_updated": "2024-06-16T08:05:00Z"
  }'

separator "5d. GET /sessions/DE/EVP/sess-099 — Must exist under URL namespace (expect 200)"
run_curl "sess-099 found under DE/EVP" 200 \
  "$RECEIVER_BASE_URL/DE/EVP/sess-099" \
  "${OCPI_HEADERS[@]}"

separator "5e. GET /sessions/FR/CPO/sess-099 — Must NOT exist under body namespace (expect 404)"
run_curl "sess-099 must not appear under FR/CPO" 404 \
  "$RECEIVER_BASE_URL/FR/CPO/sess-099" \
  "${OCPI_HEADERS[@]}"

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