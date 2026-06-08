#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Locations module OCPI 2.2.1 - test curl commands with assertions
#
# Every PUT/PATCH is followed by a GET that asserts the expected fields.
#
# In this test:
#   - Our platform acts as eMSP: FR/ZET (the Tenant)
#   - Partner CPO: FR/108 (the TenantPartner)
#
# Usage:
#   chmod +x locations-test-curls.sh
#   ./locations-test-curls.sh

OCPI_BASE="${OCPI_BASE:-http://127.0.0.1:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
SENDER_PREFIX="$OCPI_BASE/cpo/$OCPI_VERSION"
RECEIVER_PREFIX="$OCPI_BASE/emsp/$OCPI_VERSION"
BASE_URL="$RECEIVER_PREFIX/locations/FR/108"

AUTH_TOKEN="Token YmMzZjk0NjQtZjVmMS00MDdkLWI4OTQtODg0ODZlZmVkYmE2"
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

# Execute a curl, print HTTP status, return body via stdout
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

# Assert a dot-path equals an expected string value
# Supports array indices: data.evses.0.uid
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

# Assert an array at dot-path contains a value
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

# Assert an array at dot-path has a given length
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

# Assert OCPI status_code in body is NOT 1000 (i.e. an error was returned)
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
# PHASE 0 — Seed tariffs required by location tests
# ===========================================================================
TARIFF_BASE_URL="$RECEIVER_PREFIX/tariffs/FR/108"

seed_tariff() {
  local tariff_id="$1"
  do_curl 200 \
    -X PUT "$TARIFF_BASE_URL/$tariff_id" \
    "${OCPI_HEADERS[@]}" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$tariff_id\",
      \"country_code\": \"FR\",
      \"party_id\": \"108\",
      \"currency\": \"EUR\",
      \"type\": \"REGULAR\",
      \"elements\": [
        {
          \"price_components\": [
            {
              \"type\": \"ENERGY\",
              \"price\": 0.25,
              \"vat\": 0.20,
              \"step_size\": 1
            }
          ]
        }
      ]
    }" > /dev/null
}

separator "0. Seed tariffs used by location tests"
seed_tariff "TARIFF-001"
seed_tariff "TARIFF-002"
seed_tariff "TARIFF-003"
seed_tariff "TARIFF-004"
seed_tariff "TARIFF-005"
seed_tariff "TARIFF-006"
seed_tariff "TARIFF-NEW-001"

# ===========================================================================
# PHASE 1 — PUT full Location, GET and assert round-trip
# ===========================================================================

separator "1. PUT /LOC-TEST-015 — Full location with 2 EVSEs and connectors"
do_curl 200 \
  -X PUT "$BASE_URL/LOC-TEST-015" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "108",
    "id": "LOC-TEST-015",
    "publish": true,
    "name": "Paris Charging Hub",
    "address": "15 Rue de Rivoli",
    "city": "Paris",
    "postal_code": "75001",
    "state": "Ile-de-France",
    "country": "FRA",
    "coordinates": { "latitude": "48.857489", "longitude": "2.351074" },
    "parking_type": "ON_STREET",
    "related_locations": [
      { "latitude": "48.857600", "longitude": "2.351200", "name": { "language": "en", "text": "Main entrance" } }
    ],
    "evses": [
      {
        "uid": "EVSE-001",
        "evse_id": "FR*108*E000000001",
        "status": "AVAILABLE",
        "status_schedule": [
          { "period_begin": "2025-01-01T00:00:00Z", "period_end": "2025-12-31T23:59:59Z", "status": "AVAILABLE" }
        ],
        "capabilities": ["CHARGING_PROFILE_CAPABLE", "REMOTE_START_STOP_CAPABLE", "RESERVABLE", "RFID_READER"],
        "connectors": [
          {
            "id": "1", "standard": "IEC_62196_T2", "format": "SOCKET", "power_type": "AC_3_PHASE",
            "max_voltage": 230, "max_amperage": 32, "max_electric_power": 22000,
            "tariff_ids": ["TARIFF-001", "TARIFF-002"],
            "terms_and_conditions": "https://example.com/terms",
            "last_updated": "2025-01-15T10:00:00Z"
          },
          {
            "id": "2", "standard": "IEC_62196_T2_COMBO", "format": "CABLE", "power_type": "DC",
            "max_voltage": 920, "max_amperage": 400, "max_electric_power": 150000,
            "tariff_ids": ["TARIFF-003"],
            "terms_and_conditions": "https://example.com/terms",
            "last_updated": "2025-01-15T10:00:00Z"
          }
        ],
        "floor_level": "-1",
        "coordinates": { "latitude": "48.857489", "longitude": "2.351074" },
        "physical_reference": "A1",
        "directions": [
          { "language": "en", "text": "Take the ramp down to level -1, EVSE is on the left" },
          { "language": "fr", "text": "Prenez la rampe jusqu au niveau -1, la borne est a gauche" }
        ],
        "parking_restrictions": ["EV_ONLY"],
        "images": [
          { "url": "https://example.com/images/evse001.jpg", "category": "CHARGER", "type": "jpeg", "width": 800, "height": 600 }
        ],
        "last_updated": "2025-01-15T10:00:00Z"
      },
      {
        "uid": "EVSE-002",
        "evse_id": "FR*108*E000000002",
        "status": "CHARGING",
        "capabilities": ["CONTACTLESS_CARD_SUPPORT", "CREDIT_CARD_PAYABLE", "REMOTE_START_STOP_CAPABLE"],
        "connectors": [
          {
            "id": "1", "standard": "CHADEMO", "format": "CABLE", "power_type": "DC",
            "max_voltage": 500, "max_amperage": 120, "max_electric_power": 50000,
            "tariff_ids": ["TARIFF-004"],
            "last_updated": "2025-01-15T10:00:00Z"
          }
        ],
        "floor_level": "0",
        "physical_reference": "B2",
        "parking_restrictions": ["EV_ONLY", "CUSTOMERS"],
        "last_updated": "2025-01-15T10:00:00Z"
      }
    ],
    "directions": [ { "language": "en", "text": "Located next to the Louvre entrance, near bus stop 42" } ],
    "operator": {
      "name": "108Charge", "website": "https://108charge.example.com",
      "logo": { "url": "https://108charge.example.com/logo.png", "category": "OPERATOR", "type": "png", "width": 200, "height": 200 }
    },
    "suboperator": { "name": "SubCharge Paris", "website": "https://subcharge.example.com" },
    "owner": { "name": "City of Paris", "website": "https://paris.fr" },
    "facilities": ["HOTEL", "SHOPPING_CENTRE", "MUSEUM"],
    "time_zone": "Europe/Paris",
    "opening_times": {
      "twentyfourseven": false,
      "regular_hours": [
        { "weekday": 1, "period_begin": "07:00", "period_end": "22:00" },
        { "weekday": 2, "period_begin": "07:00", "period_end": "22:00" },
        { "weekday": 3, "period_begin": "07:00", "period_end": "22:00" },
        { "weekday": 4, "period_begin": "07:00", "period_end": "22:00" },
        { "weekday": 5, "period_begin": "07:00", "period_end": "22:00" },
        { "weekday": 6, "period_begin": "08:00", "period_end": "23:00" },
        { "weekday": 7, "period_begin": "09:00", "period_end": "20:00" }
      ],
      "exceptional_openings": [ { "period_begin": "2025-12-25T10:00:00Z", "period_end": "2025-12-25T18:00:00Z" } ],
      "exceptional_closings": [ { "period_begin": "2025-05-01T00:00:00Z", "period_end": "2025-05-01T23:59:59Z" } ]
    },
    "charging_when_closed": true,
    "images": [ { "url": "https://example.com/images/loc001.jpg", "category": "LOCATION", "type": "jpeg", "width": 1920, "height": 1080 } ],
    "energy_mix": {
      "is_green_energy": true,
      "energy_sources": [ { "source": "SOLAR", "percentage": 60.0 }, { "source": "WIND", "percentage": 40.0 } ],
      "environ_impact": [ { "category": "CARBON_DIOXIDE", "amount": 0.0 } ],
      "supplier_name": "GreenPower FR",
      "energy_product_name": "Pure Green 100"
    },
    "last_updated": "2025-01-15T10:00:00Z"
  }' > /dev/null

separator "2. GET /LOC-TEST-015 — Assert full location round-trip"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015" "${OCPI_HEADERS[@]}")
echo "  -- Location --"
assert_field   "$body" "data.party_id"                          "108"
assert_field   "$body" "data.country_code"                      "FR"
assert_field   "$body" "data.id"                                "LOC-TEST-015"
assert_field   "$body" "data.publish"                           "true"
assert_field   "$body" "data.name"                              "Paris Charging Hub"
assert_field   "$body" "data.address"                           "15 Rue de Rivoli"
assert_field   "$body" "data.city"                              "Paris"
assert_field   "$body" "data.postal_code"                       "75001"
assert_field   "$body" "data.country"                           "FRA"
assert_field   "$body" "data.parking_type"                      "ON_STREET"
assert_field   "$body" "data.time_zone"                         "Europe/Paris"
assert_field   "$body" "data.charging_when_closed"              "true"
assert_field   "$body" "data.coordinates.latitude"              "48.857489"
assert_field   "$body" "data.coordinates.longitude"             "2.351074"
assert_field   "$body" "data.operator.name"                     "108Charge"
assert_field   "$body" "data.suboperator.name"                  "SubCharge Paris"
assert_field   "$body" "data.owner.name"                        "City of Paris"
assert_field   "$body" "data.energy_mix.is_green_energy"        "true"
assert_field   "$body" "data.energy_mix.supplier_name"          "GreenPower FR"
assert_field   "$body" "data.opening_times.twentyfourseven"     "false"
assert_contains "$body" "data.facilities"                       "HOTEL"
assert_contains "$body" "data.facilities"                       "MUSEUM"
assert_length  "$body" "data.evses"                             "2"
assert_length  "$body" "data.images"                            "1"
assert_length  "$body" "data.directions"                        "1"
assert_length  "$body" "data.related_locations"                 "1"
echo "  -- EVSE-001 --"

evse001=$(get_evse_json "$body" "EVSE-001" "FR*108*E000000001")
if [ "$evse001" = "__MISSING__" ]; then
  echo -e "    ${RED}✗${RESET} EVSE-001 not found by uid/evse_id"
  FAIL=$((FAIL + 1))
else
  assert_field    "$evse001" "uid"                 "EVSE-001"
  assert_field    "$evse001" "status"              "AVAILABLE"
  assert_field    "$evse001" "floor_level"         "-1"
  assert_field    "$evse001" "physical_reference"  "A1"
  assert_field    "$evse001" "coordinates.latitude" "48.857489"
  assert_contains "$evse001" "capabilities"        "RFID_READER"
  assert_contains "$evse001" "capabilities"        "RESERVABLE"
  assert_contains "$evse001" "parking_restrictions" "EV_ONLY"
  assert_length   "$evse001" "connectors"          "2"
  assert_length   "$evse001" "status_schedule"     "1"
  assert_length   "$evse001" "images"              "1"
  assert_length   "$evse001" "directions"          "2"
  echo "  -- EVSE-001 connector 1 --"
  assert_field   "$evse001" "connectors.0.id"           "1"
  assert_field   "$evse001" "connectors.0.standard"     "IEC_62196_T2"
  assert_field   "$evse001" "connectors.0.format"       "SOCKET"
  assert_field   "$evse001" "connectors.0.power_type"   "AC_3_PHASE"
  assert_field   "$evse001" "connectors.0.max_voltage"  "230"
  assert_field   "$evse001" "connectors.0.max_amperage" "32"
  assert_contains "$evse001" "connectors.0.tariff_ids"  "TARIFF-001"
  assert_contains "$evse001" "connectors.0.tariff_ids"  "TARIFF-002"
  echo "  -- EVSE-001 connector 2 --"
  assert_field   "$evse001" "connectors.1.id"           "2"
  assert_field   "$evse001" "connectors.1.standard"     "IEC_62196_T2_COMBO"
  assert_contains "$evse001" "connectors.1.tariff_ids"  "TARIFF-003"
fi

echo "  -- EVSE-002 --"
evse002=$(get_evse_json "$body" "EVSE-002" "FR*108*E000000002")
if [ "$evse002" = "__MISSING__" ]; then
  echo -e "    ${RED}✗${RESET} EVSE-002 not found by uid/evse_id"
  FAIL=$((FAIL + 1))
else
  assert_field    "$evse002" "uid"                  "EVSE-002"
  assert_field    "$evse002" "status"               "CHARGING"
  assert_field    "$evse002" "floor_level"          "0"
  assert_contains "$evse002" "capabilities"         "CREDIT_CARD_PAYABLE"
  assert_contains "$evse002" "parking_restrictions" "CUSTOMERS"
  assert_length   "$evse002" "connectors"           "1"
  assert_contains "$evse002" "connectors.0.tariff_ids" "TARIFF-004"
fi

# ===========================================================================
# PHASE 2 — GET individual EVSE and Connector
# ===========================================================================

separator "3. GET /LOC-TEST-015/EVSE-001 — Assert EVSE object"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015/EVSE-001" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.uid"             "EVSE-001"
assert_field   "$body" "data.status"          "AVAILABLE"
assert_field   "$body" "data.evse_id"         "FR*108*E000000001"
assert_field   "$body" "data.floor_level"     "-1"
assert_contains "$body" "data.capabilities"   "RFID_READER"
assert_length  "$body" "data.connectors"      "2"

separator "4. GET /LOC-TEST-015/EVSE-001/1 — Assert connector object"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015/EVSE-001/1" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.id"              "1"
assert_field   "$body" "data.standard"        "IEC_62196_T2"
assert_field   "$body" "data.format"          "SOCKET"
assert_field   "$body" "data.power_type"      "AC_3_PHASE"
assert_field   "$body" "data.max_voltage"     "230"
assert_field   "$body" "data.max_amperage"    "32"
assert_contains "$body" "data.tariff_ids"     "TARIFF-001"

# ===========================================================================
# PHASE 3 — PUT standalone EVSE, GET and assert
# ===========================================================================

separator "5. PUT /LOC-TEST-015/EVSE-003 — Add new EVSE to existing location"
do_curl 200 \
  -X PUT "$BASE_URL/LOC-TEST-015/EVSE-003" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "EVSE-003",
    "evse_id": "FR*108*E000000003",
    "status": "AVAILABLE",
    "capabilities": ["RFID_READER", "REMOTE_START_STOP_CAPABLE"],
    "connectors": [
      {
        "id": "1", "standard": "IEC_62196_T2", "format": "CABLE", "power_type": "AC_1_PHASE",
        "max_voltage": 230, "max_amperage": 16, "max_electric_power": 3680,
        "tariff_ids": ["TARIFF-005"],
        "last_updated": "2025-02-01T08:00:00Z"
      }
    ],
    "floor_level": "1",
    "physical_reference": "C3",
    "parking_restrictions": ["EV_ONLY"],
    "last_updated": "2025-02-01T08:00:00Z"
  }' > /dev/null

separator "6. GET /LOC-TEST-015/EVSE-003 — Assert new EVSE"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015/EVSE-003" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.uid"                              "EVSE-003"
assert_field   "$body" "data.status"                           "AVAILABLE"
assert_field   "$body" "data.floor_level"                      "1"
assert_field   "$body" "data.physical_reference"               "C3"
assert_contains "$body" "data.capabilities"                    "RFID_READER"
assert_contains "$body" "data.parking_restrictions"            "EV_ONLY"
assert_length  "$body" "data.connectors"                       "1"
assert_field   "$body" "data.connectors.0.id"                  "1"
assert_field   "$body" "data.connectors.0.standard"            "IEC_62196_T2"
assert_contains "$body" "data.connectors.0.tariff_ids"         "TARIFF-005"

# ===========================================================================
# PHASE 4 — PUT standalone Connector, GET and assert
# ===========================================================================

separator "7. PUT /LOC-TEST-015/EVSE-003/2 — Add second connector to EVSE-003"
do_curl 200 \
  -X PUT "$BASE_URL/LOC-TEST-015/EVSE-003/2" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "2",
    "standard": "DOMESTIC_F",
    "format": "SOCKET",
    "power_type": "AC_1_PHASE",
    "max_voltage": 230,
    "max_amperage": 10,
    "max_electric_power": 2300,
    "tariff_ids": ["TARIFF-006"],
    "last_updated": "2025-02-01T09:00:00Z"
  }' > /dev/null

separator "8. GET /LOC-TEST-015/EVSE-003/2 — Assert second connector"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015/EVSE-003/2" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.id"                "2"
assert_field   "$body" "data.standard"          "DOMESTIC_F"
assert_field   "$body" "data.format"            "SOCKET"
assert_field   "$body" "data.max_voltage"       "230"
assert_field   "$body" "data.max_amperage"      "10"
assert_field   "$body" "data.max_electric_power" "2300"
assert_contains "$body" "data.tariff_ids"       "TARIFF-006"

# ===========================================================================
# PHASE 5 — PATCH Location, GET and assert patched + unchanged fields
# ===========================================================================

separator "9. PATCH /LOC-TEST-015 — Update name and parking_type"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-TEST-015" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Paris Charging Hub UPDATED",
    "parking_type": "PARKING_GARAGE",
    "last_updated": "2025-03-01T12:00:00Z"
  }' > /dev/null

separator "10. GET /LOC-TEST-015 — Assert patch applied, unpatched fields unchanged"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_field   "$body" "data.name"              "Paris Charging Hub UPDATED"
assert_field   "$body" "data.parking_type"      "PARKING_GARAGE"
echo "  -- unchanged --"
assert_field   "$body" "data.city"              "Paris"
assert_field   "$body" "data.country"           "FRA"
assert_field   "$body" "data.operator.name"     "108Charge"
assert_field   "$body" "data.energy_mix.supplier_name" "GreenPower FR"
assert_length  "$body" "data.evses"             "3"

# ===========================================================================
# PHASE 6 — PATCH EVSE status, GET and assert
# ===========================================================================

separator "11. PATCH /LOC-TEST-015/EVSE-001 — Status to CHARGING"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-TEST-015/EVSE-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CHARGING",
    "last_updated": "2025-03-01T13:00:00Z"
  }' > /dev/null

separator "12. GET /LOC-TEST-015/EVSE-001 — Assert status changed, other fields unchanged"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015/EVSE-001" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_field   "$body" "data.status"            "CHARGING"
echo "  -- unchanged --"
assert_field   "$body" "data.floor_level"       "-1"
assert_field   "$body" "data.physical_reference" "A1"
assert_contains "$body" "data.capabilities"     "RFID_READER"
assert_length  "$body" "data.connectors"        "2"

separator "13. PATCH /LOC-TEST-015/EVSE-002 — Mark as REMOVED"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-TEST-015/EVSE-002" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REMOVED",
    "last_updated": "2025-03-01T14:00:00Z"
  }' > /dev/null

separator "14. GET /LOC-TEST-015/EVSE-002 — Assert EVSE-002 is REMOVED"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015/EVSE-002" "${OCPI_HEADERS[@]}")
assert_field "$body" "data.status" "REMOVED"

# ===========================================================================
# PHASE 7 — PATCH Connector tariff_ids, GET and assert
# ===========================================================================

separator "15. PATCH /LOC-TEST-015/EVSE-001/1 — Update tariff_ids"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-TEST-015/EVSE-001/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["TARIFF-NEW-001"],
    "last_updated": "2025-03-01T15:00:00Z"
  }' > /dev/null

separator "16. GET /LOC-TEST-015/EVSE-001/1 — Assert tariff updated, other fields unchanged"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015/EVSE-001/1" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_contains "$body" "data.tariff_ids"       "TARIFF-NEW-001"
echo "  -- unchanged --"
assert_field   "$body" "data.standard"          "IEC_62196_T2"
assert_field   "$body" "data.max_voltage"       "230"
assert_field   "$body" "data.max_amperage"      "32"

# ===========================================================================
# PHASE 8 — Error cases
# ===========================================================================

separator "17. PATCH /LOC-TEST-015 — Missing last_updated (expect OCPI error)"
body=$(do_curl 200 \
  -X PATCH "$BASE_URL/LOC-TEST-015" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Should fail - no last_updated" }')
assert_ocpi_error "$body" "PATCH without last_updated"

separator "18. GET /LOC-NONEXISTENT — Unknown location (expect OCPI 2003)"
body=$(do_curl 200 "$BASE_URL/LOC-NONEXISTENT" "${OCPI_HEADERS[@]}")
assert_ocpi_error "$body" "GET unknown location"

separator "19. GET /LOC-TEST-015/EVSE-999 — Unknown EVSE (expect OCPI error)"
body=$(do_curl 200 "$BASE_URL/LOC-TEST-015/EVSE-999" "${OCPI_HEADERS[@]}")
assert_ocpi_error "$body" "GET unknown EVSE"

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