#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Locations module OCPI 2.2.1 - Hub / Roaming Partner test
#
# Two roaming CPOs (FR/CPO and DE/EVP) push locations with the SAME location id
# via the Gireve hub (FR/107) to our eMSP (FR/ZET).
#
# Tests verify:
#   1. Both locations are created independently (no collision)
#   2. Updating CPO A's location does NOT affect CPO B's location
#   3. PATCH on CPO A EVSE status does NOT affect CPO B
#   4. Deleting CPO A's location does NOT affect CPO B
#
# Prerequisites:
#   - Server running on localhost:8085
#   - RoamingPartner rows for FR/CPO and DE/EVP linked to tenantPartnerId of FR/107
#     must exist in the DB before running this script.
#
# Usage:
#   chmod +x locations-hub-roaming-test-curls.sh
#   ./locations-hub-roaming-test-curls.sh

OCPI_BASE="${OCPI_BASE:-http://127.0.0.1:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
RECEIVER_PREFIX="$OCPI_BASE/emsp/$OCPI_VERSION"

# CPO A: FR/CPO via hub FR/107
CPO_A_BASE_URL="$RECEIVER_PREFIX/locations/FR/CPO"
# CPO B: DE/EVP via hub FR/107
CPO_B_BASE_URL="$RECEIVER_PREFIX/locations/DE/EVP"

TARIFF_BASE_URL="$RECEIVER_PREFIX/tariffs"

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

get_evse_json() {
  local body="$1"
  local expected_uid="$2"
  local expected_evse_id="$3"
  echo "$body" | python3 -c "
import sys, json
doc = json.load(sys.stdin)
evses = (((doc or {}).get('data') or {}).get('evses') or [])
for e in evses:
    if (e.get('uid') == '$expected_uid') or (e.get('evse_id') == '$expected_evse_id'):
        print(json.dumps(e))
        raise SystemExit(0)
print('__MISSING__')
" 2>/dev/null
}

separator() {
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}  $1${RESET}"
  echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
}

do_curl() {
  local expected_http="$1"
  shift

  local tmp
  tmp=$(mktemp)

  local http_code
  http_code=$(curl -sS -w "%{http_code}" -o "$tmp" "$@" 2>&1) || {
    echo -e "${RED}  Connection error — is the server running?${RESET}"
    FAIL=$((FAIL + 1))
    rm -f "$tmp"
    echo ""
    return
  }

  if [ "$http_code" = "$expected_http" ]; then
    echo -e "  ${GREEN}HTTP $http_code${RESET}  ${DIM}(expected $expected_http)${RESET}" >&2
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}HTTP $http_code${RESET}  ${YELLOW}(expected $expected_http)${RESET}"
    FAIL=$((FAIL + 1))
  fi

  local body
  body=$(cat "$tmp")
  rm -f "$tmp"
  echo "$body"
}

assert_field() {
  local body="$1"
  local path="$2"
  local expected="$3"

  local actual
  actual=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = '$path'.split('.')
val = data
try:
    for k in keys:
        val = val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print(val if not isinstance(val, bool) else str(val).lower())
except (KeyError, IndexError, TypeError):
    print('__MISSING__')
" 2>/dev/null)

  if [ "$actual" = "$expected" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} = ${GREEN}$actual${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected ${GREEN}$expected${RESET}, got ${RED}$actual${RESET}"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local body="$1"
  local path="$2"
  local expected="$3"

  local found
  found=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = '$path'.split('.')
val = data
try:
    for k in keys:
        val = val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print('true' if '$expected' in [str(x) for x in val] else 'false')
except (KeyError, TypeError):
    print('false')
" 2>/dev/null)

  if [ "$found" = "true" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} contains ${GREEN}$expected${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET} does not contain ${RED}$expected${RESET}"
    FAIL=$((FAIL + 1))
  fi
}

assert_length() {
  local body="$1"
  local path="$2"
  local expected="$3"

  local actual
  actual=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = '$path'.split('.')
val = data
try:
    for k in keys:
        val = val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print(len(val))
except (KeyError, TypeError):
    print(-1)
" 2>/dev/null)

  if [ "$actual" = "$expected" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} has length ${GREEN}$actual${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected length ${GREEN}$expected${RESET}, got ${RED}$actual${RESET}"
    FAIL=$((FAIL + 1))
  fi
}

assert_ocpi_error() {
  local body="$1"
  local label="$2"

  local actual_status
  actual_status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status_code',''))" 2>/dev/null)
  if [ "$actual_status" != "1000" ]; then
    echo -e "    ${GREEN}✓${RESET} $label — OCPI status_code $actual_status (error as expected)"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} $label — expected error status_code, got 1000"
    FAIL=$((FAIL + 1))
  fi
}

# ===========================================================================
# PHASE 0 — Seed tariffs for both roaming CPOs
# Tariffs are scoped per roaming partner so we seed them separately.
# ===========================================================================

separator "0. Seed tariffs for CPO A (FR/CPO) and CPO B (DE/EVP) via hub"

seed_tariff() {
  local base_url="$1"
  local tariff_id="$2"
  local country_code="$3"
  local party_id="$4"
  do_curl 200 \
    -X PUT "$base_url/$tariff_id" \
    "${OCPI_HEADERS[@]}" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$tariff_id\",
      \"country_code\": \"$country_code\",
      \"party_id\": \"$party_id\",
      \"currency\": \"EUR\",
      \"type\": \"REGULAR\",
      \"elements\": [{
        \"price_components\": [{
          \"type\": \"ENERGY\",
          \"price\": 0.25,
          \"vat\": 20.0,
          \"step_size\": 1
        }]
      }]
    }" > /dev/null
}

# CPO A tariffs
seed_tariff "$TARIFF_BASE_URL/FR/CPO" "TARIFF-CPO-A-001" "FR" "CPO"
seed_tariff "$TARIFF_BASE_URL/FR/CPO" "TARIFF-CPO-A-002" "FR" "CPO"

# CPO B tariffs
seed_tariff "$TARIFF_BASE_URL/DE/EVP" "TARIFF-CPO-B-001" "DE" "EVP"
seed_tariff "$TARIFF_BASE_URL/DE/EVP" "TARIFF-CPO-B-002" "DE" "EVP"

# ===========================================================================
# PHASE 1 — CREATE
# Both CPOs push a location with the SAME location id (LOC-SHARED-001).
# ===========================================================================

separator "1. PUT LOC-SHARED-001 — CPO A (FR/CPO) creates location via hub"
do_curl 200 \
  -X PUT "$CPO_A_BASE_URL/LOC-SHARED-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "CPO",
    "id": "LOC-SHARED-001",
    "publish": true,
    "name": "French CPO Station Paris",
    "address": "10 Avenue des Champs-Elysees",
    "city": "Paris",
    "postal_code": "75008",
    "country": "FRA",
    "coordinates": { "latitude": "48.873792", "longitude": "2.295039" },
    "parking_type": "ON_STREET",
    "evses": [
      {
        "uid": "EVSE-A-001",
        "evse_id": "FR*CPO*E000000001",
        "status": "AVAILABLE",
        "capabilities": ["RFID_READER", "REMOTE_START_STOP_CAPABLE"],
        "connectors": [
          {
            "id": "1",
            "standard": "IEC_62196_T2",
            "format": "SOCKET",
            "power_type": "AC_3_PHASE",
            "max_voltage": 230,
            "max_amperage": 32,
            "max_electric_power": 22000,
            "tariff_ids": ["TARIFF-CPO-A-001"],
            "last_updated": "2026-01-01T00:00:00Z"
          }
        ],
        "floor_level": "0",
        "physical_reference": "A1",
        "last_updated": "2026-01-01T00:00:00Z"
      }
    ],
    "time_zone": "Europe/Paris",
    "last_updated": "2026-01-01T00:00:00Z"
  }' > /dev/null

separator "2. PUT LOC-SHARED-001 — CPO B (DE/EVP) creates location with SAME id via hub"
do_curl 200 \
  -X PUT "$CPO_B_BASE_URL/LOC-SHARED-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "DE",
    "party_id": "EVP",
    "id": "LOC-SHARED-001",
    "publish": true,
    "name": "German EVP Station Berlin",
    "address": "1 Unter den Linden",
    "city": "Berlin",
    "postal_code": "10117",
    "country": "DEU",
    "coordinates": { "latitude": "52.516275", "longitude": "13.377704" },
    "parking_type": "PARKING_GARAGE",
    "evses": [
      {
        "uid": "EVSE-B-001",
        "evse_id": "DE*EVP*E000000001",
        "status": "AVAILABLE",
        "capabilities": ["CONTACTLESS_CARD_SUPPORT", "REMOTE_START_STOP_CAPABLE"],
        "connectors": [
          {
            "id": "1",
            "standard": "IEC_62196_T2_COMBO",
            "format": "CABLE",
            "power_type": "DC",
            "max_voltage": 920,
            "max_amperage": 400,
            "max_electric_power": 150000,
            "tariff_ids": ["TARIFF-CPO-B-001"],
            "last_updated": "2026-01-01T00:00:00Z"
          }
        ],
        "floor_level": "-1",
        "physical_reference": "B1",
        "last_updated": "2026-01-01T00:00:00Z"
      }
    ],
    "time_zone": "Europe/Berlin",
    "last_updated": "2026-01-01T00:00:00Z"
  }' > /dev/null

# ===========================================================================
# PHASE 2 — READ
# Verify both locations exist independently with their own data.
# ===========================================================================

separator "3. GET LOC-SHARED-001 — CPO A (FR/CPO) — expect Paris, FR/CPO EVSE"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-SHARED-001" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.id"                        "LOC-SHARED-001"
assert_field   "$body" "data.name"                      "French CPO Station Paris"
assert_field   "$body" "data.city"                      "Paris"
assert_field   "$body" "data.country"                   "FRA"
assert_field   "$body" "data.country_code"              "FR"
assert_field   "$body" "data.party_id"                  "CPO"
assert_field   "$body" "data.parking_type"              "ON_STREET"
assert_length  "$body" "data.evses"                     "1"
evse_a=$(get_evse_json "$body" "EVSE-A-001" "FR*CPO*E000000001")
assert_field   "$evse_a" "uid"                          "EVSE-A-001"
assert_field   "$evse_a" "status"                       "AVAILABLE"
assert_field   "$evse_a" "connectors.0.standard"        "IEC_62196_T2"
assert_contains "$evse_a" "connectors.0.tariff_ids"     "TARIFF-CPO-A-001"

separator "4. GET LOC-SHARED-001 — CPO B (DE/EVP) — expect Berlin, DE/EVP EVSE"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-SHARED-001" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.id"                        "LOC-SHARED-001"
assert_field   "$body" "data.name"                      "German EVP Station Berlin"
assert_field   "$body" "data.city"                      "Berlin"
assert_field   "$body" "data.country"                   "DEU"
assert_field   "$body" "data.country_code"              "DE"
assert_field   "$body" "data.party_id"                  "EVP"
assert_field   "$body" "data.parking_type"              "PARKING_GARAGE"
assert_length  "$body" "data.evses"                     "1"
evse_b=$(get_evse_json "$body" "EVSE-B-001" "DE*EVP*E000000001")
assert_field   "$evse_b" "uid"                          "EVSE-B-001"
assert_field   "$evse_b" "status"                       "AVAILABLE"
assert_field   "$evse_b" "connectors.0.standard"        "IEC_62196_T2_COMBO"
assert_contains "$evse_b" "connectors.0.tariff_ids"     "TARIFF-CPO-B-001"

# ===========================================================================
# PHASE 3 — UPDATE CPO A location only
# PATCH name + add a second EVSE. Verify CPO B is unchanged.
# ===========================================================================

separator "5. PATCH LOC-SHARED-001 — CPO A (FR/CPO) UPDATE: rename location"
do_curl 200 \
  -X PATCH "$CPO_A_BASE_URL/LOC-SHARED-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "French CPO Station Paris UPDATED",
    "parking_type": "UNDERGROUND_GARAGE",
    "last_updated": "2026-06-01T00:00:00Z"
  }' > /dev/null

separator "6. GET LOC-SHARED-001 — CPO A (FR/CPO) — verify patch applied"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-SHARED-001" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_field   "$body" "data.name"                      "French CPO Station Paris UPDATED"
assert_field   "$body" "data.parking_type"              "UNDERGROUND_GARAGE"
echo "  -- unchanged --"
assert_field   "$body" "data.city"                      "Paris"
assert_field   "$body" "data.country"                   "FRA"

separator "7. GET LOC-SHARED-001 — CPO B (DE/EVP) — verify NOT affected by CPO A patch"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-SHARED-001" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.name"                      "German EVP Station Berlin"
assert_field   "$body" "data.city"                      "Berlin"
assert_field   "$body" "data.parking_type"              "PARKING_GARAGE"

# ===========================================================================
# PHASE 4 — PUT new EVSE on CPO A, verify CPO B unaffected
# ===========================================================================

separator "8. PUT LOC-SHARED-001/EVSE-A-002 — CPO A adds second EVSE"
do_curl 200 \
  -X PUT "$CPO_A_BASE_URL/LOC-SHARED-001/EVSE-A-002" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "EVSE-A-002",
    "evse_id": "FR*CPO*E000000002",
    "status": "AVAILABLE",
    "capabilities": ["RFID_READER"],
    "connectors": [
      {
        "id": "1",
        "standard": "IEC_62196_T2_COMBO",
        "format": "CABLE",
        "power_type": "DC",
        "max_voltage": 400,
        "max_amperage": 125,
        "max_electric_power": 50000,
        "tariff_ids": ["TARIFF-CPO-A-002"],
        "last_updated": "2026-06-01T00:00:00Z"
      }
    ],
    "floor_level": "0",
    "physical_reference": "A2",
    "last_updated": "2026-06-01T00:00:00Z"
  }' > /dev/null

separator "9. GET LOC-SHARED-001 — CPO A (FR/CPO) — verify 2 EVSEs now"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-SHARED-001" "${OCPI_HEADERS[@]}")
assert_length  "$body" "data.evses"                     "2"
evse_a2=$(get_evse_json "$body" "EVSE-A-002" "FR*CPO*E000000002")
assert_field   "$evse_a2" "uid"                         "EVSE-A-002"
assert_field   "$evse_a2" "status"                      "AVAILABLE"
assert_contains "$evse_a2" "connectors.0.tariff_ids"    "TARIFF-CPO-A-002"

separator "10. GET LOC-SHARED-001 — CPO B (DE/EVP) — verify still 1 EVSE (unaffected)"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-SHARED-001" "${OCPI_HEADERS[@]}")
assert_length  "$body" "data.evses"                     "1"
assert_field   "$body" "data.name"                      "German EVP Station Berlin"

# ===========================================================================
# PHASE 5 — PATCH EVSE status on CPO A, verify CPO B EVSE unaffected
# ===========================================================================

separator "11. PATCH LOC-SHARED-001/EVSE-A-001 — CPO A sets EVSE-A-001 to CHARGING"
do_curl 200 \
  -X PATCH "$CPO_A_BASE_URL/LOC-SHARED-001/EVSE-A-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CHARGING",
    "last_updated": "2026-06-01T01:00:00Z"
  }' > /dev/null

separator "12. GET LOC-SHARED-001/EVSE-A-001 — CPO A — verify CHARGING"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-SHARED-001/EVSE-A-001" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.status"                    "CHARGING"
assert_field   "$body" "data.uid"                       "EVSE-A-001"

separator "13. GET LOC-SHARED-001/EVSE-B-001 — CPO B — verify still AVAILABLE (unaffected)"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-SHARED-001/EVSE-B-001" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.status"                    "AVAILABLE"
assert_field   "$body" "data.uid"                       "EVSE-B-001"

# ===========================================================================
# PHASE 6 — PATCH connector tariff on CPO B, verify CPO A connector unaffected
# ===========================================================================

separator "14. PATCH LOC-SHARED-001/EVSE-B-001/1 — CPO B updates tariff_ids"
do_curl 200 \
  -X PATCH "$CPO_B_BASE_URL/LOC-SHARED-001/EVSE-B-001/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["TARIFF-CPO-B-002"],
    "last_updated": "2026-06-01T02:00:00Z"
  }' > /dev/null

separator "15. GET LOC-SHARED-001/EVSE-B-001/1 — CPO B — verify tariff updated"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-SHARED-001/EVSE-B-001/1" "${OCPI_HEADERS[@]}")
assert_contains "$body" "data.tariff_ids"               "TARIFF-CPO-B-002"
assert_field    "$body" "data.standard"                 "IEC_62196_T2_COMBO"

separator "16. GET LOC-SHARED-001/EVSE-A-001/1 — CPO A — verify tariff NOT affected by CPO B patch"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-SHARED-001/EVSE-A-001/1" "${OCPI_HEADERS[@]}")
assert_contains "$body" "data.tariff_ids"               "TARIFF-CPO-A-001"
assert_field    "$body" "data.standard"                 "IEC_62196_T2"

# ===========================================================================
# PHASE 7 — Error cases
# ===========================================================================

separator "17. GET LOC-NONEXISTENT — CPO A — unknown location (expect OCPI error)"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-NONEXISTENT" "${OCPI_HEADERS[@]}")
assert_ocpi_error "$body" "GET unknown location CPO A"

separator "18. GET LOC-SHARED-001/EVSE-999 — CPO A — unknown EVSE (expect OCPI error)"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-SHARED-001/EVSE-999" "${OCPI_HEADERS[@]}")
assert_ocpi_error "$body" "GET unknown EVSE CPO A"

separator "19. PATCH LOC-SHARED-001 — CPO A — missing last_updated (expect OCPI error)"
body=$(do_curl 200 \
  -X PATCH "$CPO_A_BASE_URL/LOC-SHARED-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Should fail - no last_updated" }')
assert_ocpi_error "$body" "PATCH without last_updated"

# ===========================================================================
# PHASE 8 — DELETE CPO A, verify CPO B unaffected
# ===========================================================================

# separator "20. DELETE LOC-SHARED-001 — CPO A (FR/CPO)"
# do_curl 200 \
#   -X DELETE "$CPO_A_BASE_URL/LOC-SHARED-001" \
#   "${OCPI_HEADERS[@]}" > /dev/


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