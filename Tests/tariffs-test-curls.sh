#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Tariffs module OCPI 2.2.1 - test curl commands
#
# This script tests both the Receiver interface (eMSP receiving tariffs from a CPO)
# and the Sender interface (CPO exposing its own tariffs).
#
# Per OCPI 2.2.1, tariff_id is a CiString(36) -- an opaque string, NOT necessarily
# a number. This script uses varied ID formats (alphanumeric, UUID, numeric) to
# validate correct handling of string-based tariff identifiers.
#
# Per OCPI 2.2.1, Receiver endpoints use the CPO's country_code/party_id in the URL:
#   {tariffs_endpoint_url}/{country_code}/{party_id}/{tariff_id}
#   where country_code/party_id identify the CPO that owns the tariff.
#
# In this test:
#   - Our platform acts as eMSP: FR/ZET (the Tenant)
#   - Partner CPO: FR/108 (the TenantPartner)
#
# Prerequisites:
#   1. Server running on localhost:8085
#   2. DB migration applied: Tariffs.ocpiTariffId + Tariffs.tenantPartnerId
#   3. Hasura metadata reloaded so GraphQL exposes ocpiTariffId and TenantPartner
#      on Tariffs (otherwise you get HTTP 500 / validation-failed).
#      From repo root:
#        npm run hasura:reload-metadata
#      Or: ./scripts/hasura-reload-metadata.sh
#      Set HASURA_ENDPOINT / HASURA_ADMIN_SECRET if not defaults (see script).
#
# Usage:
#   chmod +x tariffs-test-curls.sh
#   ./tariffs-test-curls.sh
#
# Or run individual sections by copying the curl commands.

OCPI_BASE="${OCPI_BASE:-http://localhost:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
SENDER_PREFIX="$OCPI_BASE/cpo/$OCPI_VERSION"
RECEIVER_PREFIX="$OCPI_BASE/emsp/$OCPI_VERSION"
SENDER_BASE_URL="$SENDER_PREFIX/tariffs"
RECEIVER_BASE_URL="$RECEIVER_PREFIX/tariffs"

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

# Executes a curl request and displays formatted output.
# Usage: run_curl <expected_http_code> [curl_args...]
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
# The CPO (FR/108) pushes tariffs to our eMSP (FR/ZET).
# URL uses CPO's country_code/party_id per OCPI 2.2.1 spec.
# The tariff is stored with a tenantPartnerId linking it to FR/108.
#
# We use varied tariff_id formats to validate CiString(36) compliance:
#   - tariff-std-001: alphanumeric with hyphens
#   - f47ac10b-58cc-4372-a567-0e02b2c3d479: full UUID
#   - 42: purely numeric (backward compat)
# ===========================================================================

separator "1. PUT tariff-std-001 — Create tariff (ENERGY + FLAT) with alphanumeric ID"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/108/tariff-std-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "tariff-std-001",
    "country_code": "FR",
    "party_id": "108",
    "currency": "EUR",
    "type": "REGULAR",
    "elements": [
      {
        "price_components": [
          {
            "type": "ENERGY",
            "price": 0.25,
            "vat": 0.20,
            "step_size": 1
          },
          {
            "type": "FLAT",
            "price": 1.50,
            "vat": 0.20,
            "step_size": 1
          }
        ]
      }
    ]
  }'

separator "2. PUT UUID tariff — Create tariff (with tariffAltText) using UUID format ID"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/108/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "country_code": "FR",
    "party_id": "108",
    "currency": "EUR",
    "tariff_alt_text": [
      { "language": "fr", "text": "Tarif heures creuses" },
      { "language": "en", "text": "Off-peak tariff" }
    ],
    "elements": [
      {
        "price_components": [
          {
            "type": "ENERGY",
            "price": 0.18,
            "vat": 0.20,
            "step_size": 1
          }
        ]
      }
    ]
  }'

separator "3. PUT numeric tariff — Create tariff with purely numeric ID (backward compat)"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/108/42" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "42",
    "country_code": "FR",
    "party_id": "108",
    "currency": "EUR",
    "type": "AD_HOC_PAYMENT",
    "elements": [
      {
        "price_components": [
          {
            "type": "ENERGY",
            "price": 0.30,
            "vat": 0.20,
            "step_size": 1
          },
          {
            "type": "TIME",
            "price": 2.00,
            "vat": 0.20,
            "step_size": 60
          }
        ]
      }
    ]
  }'

# ===========================================================================
# PHASE 2 — READ (Receiver GET + Sender GET)
# Receiver GET uses CPO's country_code/party_id (FR/108) to look up
# via TenantPartner relationship.
# Sender GET returns only our own tariffs (tenantPartnerId IS NULL).
# ===========================================================================

separator "4. GET tariff-std-001 — Retrieve alphanumeric tariff"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/108/tariff-std-001" \
  "${OCPI_HEADERS[@]}"

separator "5. GET UUID tariff — Retrieve UUID-format tariff"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/108/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  "${OCPI_HEADERS[@]}"

separator "6. GET numeric tariff — Retrieve numeric tariff"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/108/42" \
  "${OCPI_HEADERS[@]}"

separator "7. GET non-existent — Non-existent tariff with non-numeric ID (expect 404)"
run_curl 404 \
  "$RECEIVER_BASE_URL/FR/108/non-existent-tariff-xyz" \
  "${OCPI_HEADERS[@]}"

separator "8. GET /tariffs — Sender paginated list (our own tariffs only, partner tariffs excluded)"
run_curl 200 \
  "$SENDER_BASE_URL" \
  "${OCPI_HEADERS[@]}"

separator "9. GET /tariffs?limit=1&offset=0 — Pagination (page 1)"
run_curl 200 \
  "$SENDER_BASE_URL?limit=1&offset=0" \
  "${OCPI_HEADERS[@]}"

separator "10. GET /tariffs?limit=1&offset=1 — Pagination (page 2)"
run_curl 200 \
  "$SENDER_BASE_URL?limit=1&offset=1" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 3 — UPDATE (Receiver PUT on existing tariff)
# ===========================================================================

separator "11. PUT tariff-std-001 — Update tariff (add TIME component)"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/108/tariff-std-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "tariff-std-001",
    "country_code": "FR",
    "party_id": "108",
    "currency": "EUR",
    "type": "REGULAR",
    "tariff_alt_text": [
      { "language": "fr", "text": "Tarif standard mis a jour" }
    ],
    "elements": [
      {
        "price_components": [
          {
            "type": "ENERGY",
            "price": 0.28,
            "vat": 0.20,
            "step_size": 1
          },
          {
            "type": "TIME",
            "price": 2.40,
            "vat": 0.20,
            "step_size": 60
          },
          {
            "type": "FLAT",
            "price": 1.00,
            "vat": 0.20,
            "step_size": 1
          }
        ]
      }
    ]
  }'

separator "12. GET tariff-std-001 — Verify the update"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/108/tariff-std-001" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 4 — DELETE (Receiver DELETE)
# ===========================================================================

separator "13. DELETE UUID tariff"
run_curl 200 \
  -X DELETE "$RECEIVER_BASE_URL/FR/108/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  "${OCPI_HEADERS[@]}"

separator "14. GET UUID tariff — Verify deletion (expect 404)"
run_curl 404 \
  "$RECEIVER_BASE_URL/FR/108/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  "${OCPI_HEADERS[@]}"

separator "15. DELETE non-existent — Delete non-existent tariff (expect error)"
run_curl 404 \
  -X DELETE "$RECEIVER_BASE_URL/FR/108/non-existent-tariff-xyz" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 5 — CLEANUP
# ===========================================================================

separator "16. DELETE tariff-std-001 — Cleanup alphanumeric tariff"
run_curl 200 \
  -X DELETE "$RECEIVER_BASE_URL/FR/108/tariff-std-001" \
  "${OCPI_HEADERS[@]}"

separator "17. DELETE 42 — Cleanup numeric tariff"
run_curl 200 \
  -X DELETE "$RECEIVER_BASE_URL/FR/108/42" \
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
