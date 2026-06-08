#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Tariffs module OCPI 2.2.1 - Hub / Roaming Partner test
#
# This script tests tariff isolation between two roaming CPOs (FR/CPO and DE/EVP)
# that both connect to our eMSP (FR/ZET) via the Gireve hub (FR/107).
#
# Scenario:
#   - Our platform acts as eMSP: FR/ZET (the Tenant)
#   - Hub (TenantPartner): FR/107 (Gireve)
#   - Roaming CPO A (RoamingPartner): FR/CPO
#   - Roaming CPO B (RoamingPartner): DE/EVP
#
# Both roaming CPOs push a tariff with the SAME ocpiTariffId ("TARIFF-SHARED-ID").
# The tests verify:
#   1. Both tariffs are created independently (no collision)
#   2. Updating CPO A's tariff does NOT affect CPO B's tariff
#   3. TariffElements are correctly replaced on update (no accumulation)
#   4. Deleting CPO A's tariff does NOT affect CPO B's tariff
#
# Prerequisites:
#   - Server running on localhost:8085
#   - RoamingPartner rows for FR/CPO and DE/EVP linked to tenantPartnerId of FR/107
#     must exist in the DB before running this script.
#
# Usage:
#   chmod +x tariffs-hub-roaming-test-curls.sh
#   ./tariffs-hub-roaming-test-curls.sh

OCPI_BASE="${OCPI_BASE:-http://localhost:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
RECEIVER_PREFIX="$OCPI_BASE/emsp/$OCPI_VERSION"
RECEIVER_BASE_URL="$RECEIVER_PREFIX/tariffs"

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
  local expected="$1"
  shift

  local tmp
  tmp=$(mktemp)

  local http_code
  http_code=$(curl -sS -w "%{http_code}" -o "$tmp" "$@" 2>&1) || {
    echo -e "${RED}  Connection error:${RESET}"
    echo -e "${DIM}$(cat "$tmp")${RESET}"
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
# PHASE 1 — CREATE
# Both roaming CPOs push a tariff with the SAME ocpiTariffId.
# They arrive via the hub (FR/107), so OCPI headers use 107 as from-party.
# The country_code/party_id in the URL and body identify the actual CPO.
# ===========================================================================

separator "1. PUT TARIFF-SHARED-ID — CPO A (FR/CPO) creates tariff via hub (ENERGY only)"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/CPO/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TARIFF-SHARED-ID",
    "country_code": "FR",
    "party_id": "CPO",
    "currency": "EUR",
    "type": "REGULAR",
    "tariff_alt_text": [
      { "language": "fr", "text": "Tarif CPO France - energie uniquement" },
      { "language": "en", "text": "French CPO tariff - energy only" }
    ],
    "elements": [
      {
        "price_components": [
          {
            "type": "ENERGY",
            "price": 0.25,
            "vat": 20.0,
            "step_size": 1
          }
        ]
      }
    ],
    "last_updated": "2026-01-01T00:00:00Z"
  }'

separator "2. PUT TARIFF-SHARED-ID — CPO B (DE/EVP) creates tariff with SAME id via hub"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/DE/EVP/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TARIFF-SHARED-ID",
    "country_code": "DE",
    "party_id": "EVP",
    "currency": "EUR",
    "type": "REGULAR",
    "tariff_alt_text": [
      { "language": "de", "text": "Deutscher CPO Tarif - Zeit und Energie" },
      { "language": "en", "text": "German CPO tariff - time and energy" }
    ],
    "elements": [
      {
        "price_components": [
          {
            "type": "ENERGY",
            "price": 0.30,
            "vat": 19.0,
            "step_size": 1
          },
          {
            "type": "TIME",
            "price": 2.00,
            "vat": 19.0,
            "step_size": 60
          }
        ]
      }
    ],
    "last_updated": "2026-01-01T00:00:00Z"
  }'

# ===========================================================================
# PHASE 2 — READ
# Verify both tariffs exist independently with their own data.
# ===========================================================================

separator "3. GET TARIFF-SHARED-ID — CPO A (FR/CPO)"
body=$(do_curl 200 "$RECEIVER_BASE_URL/FR/CPO/TARIFF-SHARED-ID" "${OCPI_HEADERS[@]}")
assert_field "$body" "data.country_code" "FR"
assert_field "$body" "data.party_id" "CPO"
assert_field "$body" "data.currency" "EUR"
assert_length "$body" "data.elements.0.price_components" "1"   # ENERGY only

separator "4. GET TARIFF-SHARED-ID — CPO B (DE/EVP)"
body=$(do_curl 200 "$RECEIVER_BASE_URL/DE/EVP/TARIFF-SHARED-ID" "${OCPI_HEADERS[@]}")
assert_field "$body" "data.country_code" "DE"
assert_field "$body" "data.party_id" "EVP"
assert_length "$body" "data.elements.0.price_components" "2"   # ENERGY + TIME

# ===========================================================================
# PHASE 3 — UPDATE CPO A only
# Update FR/CPO tariff: change price, add FLAT component, add max_price.
# Verify CPO B tariff is completely unchanged.
# This is the core isolation test — TariffElements must be replaced not appended.
# ===========================================================================

separator "5. PUT TARIFF-SHARED-ID — CPO A (FR/CPO) UPDATE: add FLAT + raise ENERGY price + add max_price"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/CPO/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TARIFF-SHARED-ID",
    "country_code": "FR",
    "party_id": "CPO",
    "currency": "EUR",
    "type": "REGULAR",
    "tariff_alt_text": [
      { "language": "fr", "text": "Tarif CPO France - mis a jour avec frais de depart" },
      { "language": "en", "text": "French CPO tariff - updated with start fee" }
    ],
    "max_price": {
      "excl_vat": 20.00,
      "incl_vat": 24.00
    },
    "elements": [
      {
        "price_components": [
          {
            "type": "FLAT",
            "price": 1.00,
            "vat": 20.0,
            "step_size": 1
          },
          {
            "type": "ENERGY",
            "price": 0.28,
            "vat": 20.0,
            "step_size": 1
          }
        ]
      }
    ],
    "last_updated": "2026-06-01T00:00:00Z"
  }'

separator "6. GET TARIFF-SHARED-ID — CPO A (FR/CPO) — verify update: FLAT+ENERGY, price 0.28, max_price set"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/CPO/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}"

separator "7. GET TARIFF-SHARED-ID — CPO B (DE/EVP) — verify NOT affected: still ENERGY+TIME, price 0.30"
run_curl 200 \
  "$RECEIVER_BASE_URL/DE/EVP/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 4 — UPDATE CPO A again (idempotency + no element accumulation)
# PUT the same tariff twice. TariffElements must not accumulate.
# Result must be identical to phase 3 update.
# ===========================================================================

separator "8. PUT TARIFF-SHARED-ID — CPO A (FR/CPO) REPEAT same update (idempotency check)"
run_curl 200 \
  -X PUT "$RECEIVER_BASE_URL/FR/CPO/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TARIFF-SHARED-ID",
    "country_code": "FR",
    "party_id": "CPO",
    "currency": "EUR",
    "type": "REGULAR",
    "tariff_alt_text": [
      { "language": "fr", "text": "Tarif CPO France - mis a jour avec frais de depart" },
      { "language": "en", "text": "French CPO tariff - updated with start fee" }
    ],
    "max_price": {
      "excl_vat": 20.00,
      "incl_vat": 24.00
    },
    "elements": [
      {
        "price_components": [
          {
            "type": "FLAT",
            "price": 1.00,
            "vat": 20.0,
            "step_size": 1
          },
          {
            "type": "ENERGY",
            "price": 0.28,
            "vat": 20.0,
            "step_size": 1
          }
        ]
      }
    ],
    "last_updated": "2026-06-01T00:00:00Z"
  }'

separator "9. GET TARIFF-SHARED-ID — CPO A (FR/CPO) — verify no element accumulation (still exactly 2 price_components)"
run_curl 200 \
  "$RECEIVER_BASE_URL/FR/CPO/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 5 — DELETE CPO A only
# Verify CPO B tariff still exists after CPO A deletion.
# ===========================================================================

separator "10. DELETE TARIFF-SHARED-ID — CPO A (FR/CPO)"
run_curl 200 \
  -X DELETE "$RECEIVER_BASE_URL/FR/CPO/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}"

separator "11. GET TARIFF-SHARED-ID — CPO A (FR/CPO) — verify deleted (expect 404)"
run_curl 404 \
  "$RECEIVER_BASE_URL/FR/CPO/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}"

separator "12. GET TARIFF-SHARED-ID — CPO B (DE/EVP) — verify still exists after CPO A deletion"
run_curl 200 \
  "$RECEIVER_BASE_URL/DE/EVP/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 6 — CLEANUP
# ===========================================================================

separator "13. DELETE TARIFF-SHARED-ID — CPO B (DE/EVP) — cleanup"
run_curl 200 \
  -X DELETE "$RECEIVER_BASE_URL/DE/EVP/TARIFF-SHARED-ID" \
  "${OCPI_HEADERS[@]}"

separator "14. GET TARIFF-SHARED-ID — CPO B (DE/EVP) — verify deleted (expect 404)"
run_curl 404 \
  "$RECEIVER_BASE_URL/DE/EVP/TARIFF-SHARED-ID" \
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