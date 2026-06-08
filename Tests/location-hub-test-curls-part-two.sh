#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Locations module OCPI 2.2.1 - Hub / Roaming Partner Connector & PATCH tests
#
# Two roaming CPOs (FR/CPO and DE/EVP) push locations/EVSEs/connectors with
# the SAME IDs via the Gireve hub (FR/GRV) to our eMSP (FR/ZET).
#
# Tests verify:
#   - Connector GET/PUT/PATCH round-trips are isolated per roaming partner
#   - PATCH on CPO A connector does NOT affect CPO B connector
#   - Timestamp cascade (connector → EVSE → Location) is scoped per partner
#   - Error cases work correctly for hub scenario
#
# Prerequisites:
#   - Server running on localhost:8085
#   - RoamingPartner rows for FR/CPO and DE/EVP linked to FR/GRV must exist
#
# Usage:
#   chmod +x locations-hub-connector-patch-test-curls.sh
#   ./locations-hub-connector-patch-test-curls.sh

OCPI_BASE="${OCPI_BASE:-http://127.0.0.1:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
RECEIVER_PREFIX="$OCPI_BASE/emsp/$OCPI_VERSION"

CPO_A_BASE_URL="$RECEIVER_PREFIX/locations/FR/CPO"
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

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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
    echo -e "${RED}  Connection error — is the server running?${RESET}" >&2
    FAIL=$((FAIL + 1))
    rm -f "$tmp"
    echo ""
    return
  }

  if [ "$http_code" = "$expected_http" ]; then
    echo -e "  ${GREEN}HTTP $http_code${RESET}  ${DIM}(expected $expected_http)${RESET}" >&2
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}HTTP $http_code${RESET}  ${YELLOW}(expected $expected_http)${RESET}" >&2
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

assert_not_contains() {
  local body="$1"
  local path="$2"
  local unexpected="$3"

  local found
  found=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = '$path'.split('.')
val = data
try:
    for k in keys:
        val = val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print('true' if '$unexpected' in [str(x) for x in val] else 'false')
except (KeyError, TypeError):
    print('false')
" 2>/dev/null)

  if [ "$found" = "false" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} no longer contains ${GREEN}$unexpected${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET} still contains ${RED}$unexpected${RESET} (should have been replaced)"
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

get_field() {
  local body="$1"
  local path="$2"
  echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = '$path'.split('.')
val = data
try:
    for k in keys:
        val = val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print(val)
except (KeyError, IndexError, TypeError):
    print('__MISSING__')
" 2>/dev/null
}

assert_different() {
  local label="$1"
  local val_before="$2"
  local val_after="$3"

  if [ "$val_before" != "$val_after" ] && [ "$val_after" != "__MISSING__" ]; then
    echo -e "    ${GREEN}✓${RESET} $label changed: ${DIM}$val_before${RESET} → ${GREEN}$val_after${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} $label did not change (before=$val_before, after=$val_after)"
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

assert_ocpi_success() {
  local body="$1"
  local label="$2"

  local actual_status
  actual_status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status_code',''))" 2>/dev/null)
  if [ "$actual_status" = "1000" ]; then
    echo -e "    ${GREEN}✓${RESET} $label — OCPI status_code 1000"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} $label — expected 1000, got $actual_status"
    FAIL=$((FAIL + 1))
  fi
}

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

# ===========================================================================
# PHASE 0 — Seed tariffs for both roaming CPOs
# Both CPOs use same tariff IDs to stress-test isolation
# ===========================================================================

separator "0. Seed tariffs for CPO A (FR/CPO) and CPO B (DE/EVP)"

for tid in TARIFF-001 TARIFF-002 TARIFF-A TARIFF-B TARIFF-REPLACED TARIFF-NEW-X TARIFF-NEW-Y TARIFF-CASCADE TARIFF-C1; do
  seed_tariff "$TARIFF_BASE_URL/FR/CPO" "$tid" "FR" "CPO"
  seed_tariff "$TARIFF_BASE_URL/DE/EVP" "$tid" "DE" "EVP"
done

# ===========================================================================
# SETUP — Both CPOs push LOC-HUB-PATCH-001 with EVSE-A and 2 connectors
# Same location id, same EVSE uid, same connector ids — full isolation test
# ===========================================================================

separator "SETUP: PUT LOC-HUB-PATCH-001 — CPO A (FR/CPO) base location"
do_curl 200 \
  -X PUT "$CPO_A_BASE_URL/LOC-HUB-PATCH-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "CPO",
    "id": "LOC-HUB-PATCH-001",
    "publish": true,
    "name": "CPO A Hub Patch Location",
    "address": "1 Rue de la Paix",
    "city": "Paris",
    "postal_code": "75001",
    "country": "FRA",
    "coordinates": { "latitude": "48.869" , "longitude": "2.331" },
    "parking_type": "ON_STREET",
    "time_zone": "Europe/Paris",
    "evses": [
      {
        "uid": "EVSE-A",
        "evse_id": "FR*CPO*EA00000001",
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
            "tariff_ids": ["TARIFF-001", "TARIFF-002"],
            "terms_and_conditions": "https://cpo-a.example.com/terms",
            "last_updated": "2026-01-01T00:00:00Z"
          },
          {
            "id": "2",
            "standard": "IEC_62196_T2_COMBO",
            "format": "CABLE",
            "power_type": "DC",
            "max_voltage": 400,
            "max_amperage": 125,
            "max_electric_power": 50000,
            "tariff_ids": ["TARIFF-A"],
            "last_updated": "2026-01-01T00:00:00Z"
          }
        ],
        "floor_level": "0",
        "physical_reference": "A1",
        "last_updated": "2026-01-01T00:00:00Z"
      }
    ],
    "last_updated": "2026-01-01T00:00:00Z"
  }' > /dev/null

separator "SETUP: PUT LOC-HUB-PATCH-001 — CPO B (DE/EVP) base location (same ids)"
do_curl 200 \
  -X PUT "$CPO_B_BASE_URL/LOC-HUB-PATCH-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "DE",
    "party_id": "EVP",
    "id": "LOC-HUB-PATCH-001",
    "publish": true,
    "name": "CPO B Hub Patch Location",
    "address": "1 Unter den Linden",
    "city": "Berlin",
    "postal_code": "10117",
    "country": "DEU",
    "coordinates": { "latitude": "52.516", "longitude": "13.377" },
    "parking_type": "PARKING_GARAGE",
    "time_zone": "Europe/Berlin",
    "evses": [
      {
        "uid": "EVSE-A",
        "evse_id": "DE*EVP*EA00000001",
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
            "tariff_ids": ["TARIFF-001"],
            "terms_and_conditions": "https://cpo-b.example.com/terms",
            "last_updated": "2026-01-01T00:00:00Z"
          },
          {
            "id": "2",
            "standard": "IEC_62196_T2",
            "format": "SOCKET",
            "power_type": "AC_1_PHASE",
            "max_voltage": 230,
            "max_amperage": 16,
            "max_electric_power": 3680,
            "tariff_ids": ["TARIFF-B"],
            "last_updated": "2026-01-01T00:00:00Z"
          }
        ],
        "floor_level": "-1",
        "physical_reference": "B1",
        "last_updated": "2026-01-01T00:00:00Z"
      }
    ],
    "last_updated": "2026-01-01T00:00:00Z"
  }' > /dev/null

echo ""
echo -e "  ${DIM}Base locations created for both CPOs. Starting tests...${RESET}"

# ===========================================================================
# PHASE 1 — Connector GET isolation: same ids, different data
# ===========================================================================

separator "1. GET LOC-HUB-PATCH-001/EVSE-A/1 — CPO A — expect IEC_62196_T2, 230V, 32A"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
assert_ocpi_success "$body" "GET CPO A connector 1"
assert_field   "$body" "data.id"                    "1"
assert_field   "$body" "data.standard"              "IEC_62196_T2"
assert_field   "$body" "data.format"                "SOCKET"
assert_field   "$body" "data.power_type"            "AC_3_PHASE"
assert_field   "$body" "data.max_voltage"           "230"
assert_field   "$body" "data.max_amperage"          "32"
assert_field   "$body" "data.terms_and_conditions"  "https://cpo-a.example.com/terms"
assert_contains "$body" "data.tariff_ids"           "TARIFF-001"
assert_contains "$body" "data.tariff_ids"           "TARIFF-002"

separator "2. GET LOC-HUB-PATCH-001/EVSE-A/1 — CPO B — expect IEC_62196_T2_COMBO, 920V, 400A"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
assert_ocpi_success "$body" "GET CPO B connector 1"
assert_field   "$body" "data.id"                    "1"
assert_field   "$body" "data.standard"              "IEC_62196_T2_COMBO"
assert_field   "$body" "data.format"                "CABLE"
assert_field   "$body" "data.power_type"            "DC"
assert_field   "$body" "data.max_voltage"           "920"
assert_field   "$body" "data.max_amperage"          "400"
assert_field   "$body" "data.terms_and_conditions"  "https://cpo-b.example.com/terms"
assert_contains "$body" "data.tariff_ids"           "TARIFF-001"

# ===========================================================================
# PHASE 2 — PUT connector isolation: replace CPO A connector, CPO B unchanged
# ===========================================================================

separator "3. PUT LOC-HUB-PATCH-001/EVSE-A/1 — CPO A replaces connector 1"
do_curl 200 \
  -X PUT "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1",
    "standard": "IEC_62196_T2",
    "format": "CABLE",
    "power_type": "AC_1_PHASE",
    "max_voltage": 230,
    "max_amperage": 16,
    "max_electric_power": 3680,
    "tariff_ids": ["TARIFF-REPLACED"],
    "terms_and_conditions": "https://cpo-a.example.com/new-terms",
    "last_updated": "2026-02-01T10:00:00Z"
  }' > /dev/null

separator "4. GET LOC-HUB-PATCH-001/EVSE-A/1 — CPO A — verify replaced"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.format"                "CABLE"
assert_field   "$body" "data.power_type"            "AC_1_PHASE"
assert_field   "$body" "data.max_amperage"          "16"
assert_contains "$body" "data.tariff_ids"           "TARIFF-REPLACED"
assert_not_contains "$body" "data.tariff_ids"       "TARIFF-001"
assert_not_contains "$body" "data.tariff_ids"       "TARIFF-002"

separator "5. GET LOC-HUB-PATCH-001/EVSE-A/1 — CPO B — verify NOT affected by CPO A PUT"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.standard"              "IEC_62196_T2_COMBO"
assert_field   "$body" "data.format"                "CABLE"
assert_field   "$body" "data.max_voltage"           "920"
assert_field   "$body" "data.max_amperage"          "400"
assert_contains "$body" "data.tariff_ids"           "TARIFF-001"
assert_field   "$body" "data.terms_and_conditions"  "https://cpo-b.example.com/terms"

# ===========================================================================
# PHASE 3 — PATCH connector isolation: patch CPO A tariffs, CPO B unchanged
# ===========================================================================

separator "6. PATCH LOC-HUB-PATCH-001/EVSE-A/1 — CPO A updates tariff_ids"
do_curl 200 \
  -X PATCH "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["TARIFF-NEW-X", "TARIFF-NEW-Y"],
    "last_updated": "2026-02-15T08:00:00Z"
  }' > /dev/null

separator "7. GET LOC-HUB-PATCH-001/EVSE-A/1 — CPO A — verify tariff patched"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_contains    "$body" "data.tariff_ids"        "TARIFF-NEW-X"
assert_contains    "$body" "data.tariff_ids"        "TARIFF-NEW-Y"
assert_not_contains "$body" "data.tariff_ids"       "TARIFF-REPLACED"
echo "  -- unchanged --"
assert_field   "$body" "data.standard"              "IEC_62196_T2"
assert_field   "$body" "data.format"                "CABLE"
assert_field   "$body" "data.max_amperage"          "16"

separator "8. GET LOC-HUB-PATCH-001/EVSE-A/1 — CPO B — verify NOT affected by CPO A PATCH"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
assert_contains "$body" "data.tariff_ids"           "TARIFF-001"
assert_field    "$body" "data.standard"             "IEC_62196_T2_COMBO"
assert_field    "$body" "data.max_amperage"         "400"

# ===========================================================================
# PHASE 4 — PATCH cascade isolation: CPO A connector patch cascades only
#           to CPO A EVSE and Location, not CPO B
# ===========================================================================

separator "9. Capture timestamps before CPO A connector patch"
loc_a_body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001" "${OCPI_HEADERS[@]}")
evse_a_body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
loc_b_body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001" "${OCPI_HEADERS[@]}")
evse_b_body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")

loc_a_ts_before=$(get_field "$loc_a_body" "data.last_updated")
evse_a_ts_before=$(get_field "$evse_a_body" "data.last_updated")
loc_b_ts_before=$(get_field "$loc_b_body" "data.last_updated")
evse_b_ts_before=$(get_field "$evse_b_body" "data.last_updated")

echo -e "  ${DIM}CPO A Location last_updated before: $loc_a_ts_before${RESET}"
echo -e "  ${DIM}CPO A EVSE-A last_updated before:   $evse_a_ts_before${RESET}"
echo -e "  ${DIM}CPO B Location last_updated before: $loc_b_ts_before${RESET}"
echo -e "  ${DIM}CPO B EVSE-A last_updated before:   $evse_b_ts_before${RESET}"

separator "10. PATCH LOC-HUB-PATCH-001/EVSE-A/1 — CPO A triggers cascade"
do_curl 200 \
  -X PATCH "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["TARIFF-CASCADE"],
    "last_updated": "2026-06-01T12:00:00Z"
  }' > /dev/null

separator "11. Verify cascade hit CPO A but NOT CPO B"
loc_a_body_after=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001" "${OCPI_HEADERS[@]}")
evse_a_body_after=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
loc_b_body_after=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001" "${OCPI_HEADERS[@]}")
evse_b_body_after=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")

loc_a_ts_after=$(get_field "$loc_a_body_after" "data.last_updated")
evse_a_ts_after=$(get_field "$evse_a_body_after" "data.last_updated")
loc_b_ts_after=$(get_field "$loc_b_body_after" "data.last_updated")
evse_b_ts_after=$(get_field "$evse_b_body_after" "data.last_updated")

echo "  -- CPO A cascade (should have changed) --"
assert_different "CPO A Location last_updated" "$loc_a_ts_before" "$loc_a_ts_after"
assert_different "CPO A EVSE-A last_updated"   "$evse_a_ts_before" "$evse_a_ts_after"

echo "  -- CPO B (should NOT have changed) --"
if [ "$loc_b_ts_before" = "$loc_b_ts_after" ]; then
  echo -e "    ${GREEN}✓${RESET} CPO B Location last_updated unchanged (${DIM}$loc_b_ts_after${RESET})"
  PASS=$((PASS + 1))
else
  echo -e "    ${RED}✗${RESET} CPO B Location last_updated changed unexpectedly: $loc_b_ts_before → $loc_b_ts_after"
  FAIL=$((FAIL + 1))
fi
if [ "$evse_b_ts_before" = "$evse_b_ts_after" ]; then
  echo -e "    ${GREEN}✓${RESET} CPO B EVSE-A last_updated unchanged (${DIM}$evse_b_ts_after${RESET})"
  PASS=$((PASS + 1))
else
  echo -e "    ${RED}✗${RESET} CPO B EVSE-A last_updated changed unexpectedly: $evse_b_ts_before → $evse_b_ts_after"
  FAIL=$((FAIL + 1))
fi

# ===========================================================================
# PHASE 5 — PATCH EVSE status isolation
# ===========================================================================

separator "12. PATCH LOC-HUB-PATCH-001/EVSE-A — CPO B sets status to OUT_OF_ORDER"
do_curl 200 \
  -X PATCH "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "OUT_OF_ORDER",
    "last_updated": "2026-06-01T13:00:00Z"
  }' > /dev/null

separator "13. GET EVSE-A — CPO B — verify OUT_OF_ORDER"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
assert_field "$body" "data.status" "OUT_OF_ORDER"

separator "14. GET EVSE-A — CPO A — verify still AVAILABLE (unaffected)"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
assert_field "$body" "data.status" "AVAILABLE"

# ===========================================================================
# PHASE 6 — Add third connector via PUT on CPO A, verify CPO B unaffected
# ===========================================================================

separator "15. PUT LOC-HUB-PATCH-001/EVSE-A/3 — CPO A adds connector 3"
do_curl 200 \
  -X PUT "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/3" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "3",
    "standard": "CHADEMO",
    "format": "CABLE",
    "power_type": "DC",
    "max_voltage": 500,
    "max_amperage": 100,
    "max_electric_power": 50000,
    "tariff_ids": ["TARIFF-C1"],
    "last_updated": "2026-03-01T08:00:00Z"
  }' > /dev/null

separator "16. GET EVSE-A — CPO A — verify 3 connectors"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
assert_length "$body" "data.connectors" "3"

separator "17. GET EVSE-A — CPO B — verify still 2 connectors (unaffected)"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
assert_length "$body" "data.connectors" "2"

separator "18. GET LOC-HUB-PATCH-001/EVSE-A/3 — CPO A — verify connector 3 created"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/3" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.id"                "3"
assert_field   "$body" "data.standard"          "CHADEMO"
assert_contains "$body" "data.tariff_ids"       "TARIFF-C1"

separator "19. GET LOC-HUB-PATCH-001/EVSE-A/3 — CPO B — expect error (does not exist)"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/3" "${OCPI_HEADERS[@]}")
assert_ocpi_error "$body" "CPO B connector 3 should not exist"

# ===========================================================================
# PHASE 7 — Error cases
# ===========================================================================

separator "20. PATCH LOC-HUB-PATCH-001/EVSE-A/1 — CPO A — missing last_updated (expect error)"
body=$(do_curl 200 \
  -X PATCH "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "tariff_ids": ["SHOULD-FAIL"] }')
assert_ocpi_error "$body" "PATCH connector without last_updated CPO A"

separator "21. PATCH LOC-HUB-PATCH-001/EVSE-A — CPO B — missing last_updated (expect error)"
body=$(do_curl 200 \
  -X PATCH "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "status": "AVAILABLE" }')
assert_ocpi_error "$body" "PATCH EVSE without last_updated CPO B"

separator "22. GET LOC-HUB-PATCH-001/EVSE-A/99 — CPO A — unknown connector (expect error)"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/99" "${OCPI_HEADERS[@]}")
assert_ocpi_error "$body" "GET unknown connector CPO A"

separator "23. GET LOC-HUB-PATCH-001/EVSE-A/99 — CPO B — unknown connector (expect error)"
body=$(do_curl 200 "$CPO_B_BASE_URL/LOC-HUB-PATCH-001/EVSE-A/99" "${OCPI_HEADERS[@]}")
assert_ocpi_error "$body" "GET unknown connector CPO B"

separator "24. PATCH LOC-HUB-PATCH-001/EVSE-Z/1 — CPO A — unknown EVSE (expect error)"
body=$(do_curl 200 \
  -X PATCH "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-Z/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["SHOULD-FAIL"],
    "last_updated": "2026-09-01T10:00:00Z"
  }')
assert_ocpi_error "$body" "PATCH connector on unknown EVSE CPO A"

# ===========================================================================
# PHASE 8 — CLEANUP
# ===========================================================================

# OCPI 8.2.2 Receiver: DELETE n/a — removal via PATCH status REMOVED (8.1)
separator "25. DELETE not supported on Receiver (OCPI — expect 405)"
do_curl 405 \
  -X DELETE "$CPO_A_BASE_URL/LOC-HUB-PATCH-001" \
  "${OCPI_HEADERS[@]}" > /dev/null

separator "26. DELETE not supported — CPO B (expect 405)"
do_curl 405 \
  -X DELETE "$CPO_B_BASE_URL/LOC-HUB-PATCH-001" \
  "${OCPI_HEADERS[@]}" > /dev/null

separator "27. PATCH EVSE-A — CPO A — mark REMOVED (OCPI cleanup)"
do_curl 200 \
  -X PATCH "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "status": "REMOVED", "last_updated": "2026-09-02T10:00:00Z" }' > /dev/null

separator "28. GET EVSE-A — CPO A — verify REMOVED"
body=$(do_curl 200 "$CPO_A_BASE_URL/LOC-HUB-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
assert_field "$body" "data.status" "REMOVED"

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