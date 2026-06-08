#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Locations module OCPI 2.2.1 - Connector & PATCH focused tests
#
# Covers:
#   - Connector GET/PUT/PATCH round-trips with all fields
#   - PATCH idempotency (patch same field twice)
#   - PATCH partial updates (only specified fields change)
#   - PATCH cascade: connector patch must update parent EVSE + Location last_updated
#   - PATCH cascade: EVSE patch must update parent Location last_updated
#   - Error cases: missing last_updated, unknown IDs
#
# In this test:
#   - Our platform acts as eMSP: FR/ZTA (the Tenant)
#   - Partner CPO: FR/TMS (the TenantPartner)
#   - Location used: LOC-PATCH-001 (created fresh by this script)
#
# Usage:
#   chmod +x locations-connector-patch-test-curls.sh
#   ./locations-connector-patch-test-curls.sh

OCPI_BASE="${OCPI_BASE:-http://127.0.0.1:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
SENDER_PREFIX="$OCPI_BASE/cpo/$OCPI_VERSION"
RECEIVER_PREFIX="$OCPI_BASE/emsp/$OCPI_VERSION"
BASE_URL="$RECEIVER_PREFIX/locations/FR/TMS"

AUTH_TOKEN="Token YjU5ZGNlYTctZWM4My00NjQwLTllNTEtZWY0MjA2NDgwMDc0"

OCPI_HEADERS=(
  -H "Authorization: $AUTH_TOKEN"
  -H "X-Request-ID: $(uuidgen 2>/dev/null || echo test-req-001)"
  -H "X-Correlation-ID: $(uuidgen 2>/dev/null || echo test-corr-001)"
  -H "OCPI-from-country-code: FR"
  -H "OCPI-from-party-id: TMS"
  -H "OCPI-to-country-code: FR"
  -H "OCPI-to-party-id: ZTA"
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

# Execute a curl, print HTTP status to stderr, return body via stdout
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

# Assert a dot-path does NOT equal a value (useful for checking field changed)
assert_field_not() {
  local body="$1"
  local path="$2"
  local unexpected="$3"

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

  if [ "$actual" != "$unexpected" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} changed from ${GREEN}$unexpected${RESET} to ${GREEN}$actual${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected value to change from ${RED}$unexpected${RESET} but it did not"
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

# Assert an array at dot-path does NOT contain a value (useful for checking tariff replaced)
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

# Extract a raw field value (no assertion) for use in later comparisons
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

# Assert two values are different (used for timestamp cascade checks)
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

# Assert OCPI status_code in body is NOT 1000
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

# Assert OCPI status_code is 1000
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


# ===========================================================================
# PHASE 0 — Seed tariffs required by connector/patch tests
# ===========================================================================
TARIFF_BASE_URL="$RECEIVER_PREFIX/tariffs/FR/TMS"

seed_tariff() {
  local tariff_id="$1"
  do_curl 200 \
    -X PUT "$TARIFF_BASE_URL/$tariff_id" \
    "${OCPI_HEADERS[@]}" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$tariff_id\",
      \"country_code\": \"FR\",
      \"party_id\": \"TMS\",
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

separator "0. Seed tariffs used by connector/patch tests"
seed_tariff "TARIFF-A1"
seed_tariff "TARIFF-A2"
seed_tariff "TARIFF-B1"
seed_tariff "TARIFF-REPLACED"
seed_tariff "TARIFF-NEW-X"
seed_tariff "TARIFF-NEW-Y"
seed_tariff "TARIFF-IDEMPOTENT"
seed_tariff "TARIFF-CASCADE"
seed_tariff "TARIFF-C1"

# ===========================================================================
# SETUP — PUT base location with 1 EVSE and 2 connectors
# All subsequent tests build on LOC-PATCH-001
# ===========================================================================

separator "SETUP: PUT /LOC-PATCH-001 — Base location with EVSE-A (2 connectors)"
do_curl 200 \
  -X PUT "$BASE_URL/LOC-PATCH-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "TMS",
    "id": "LOC-PATCH-001",
    "publish": true,
    "name": "Connector Test Location",
    "address": "42 Avenue des Tests",
    "city": "Lyon",
    "postal_code": "69001",
    "country": "FRA",
    "coordinates": { "latitude": "45.764043", "longitude": "4.835659" },
    "parking_type": "PARKING_GARAGE",
    "time_zone": "Europe/Paris",
    "operator": { "name": "TestCPO", "website": "https://testcpo.example.com" },
    "evses": [
      {
        "uid": "EVSE-A",
        "evse_id": "FR*TMS*EA00000001",
        "status": "AVAILABLE",
        "capabilities": ["RFID_READER", "REMOTE_START_STOP_CAPABLE", "RESERVABLE"],
        "connectors": [
          {
            "id": "1",
            "standard": "IEC_62196_T2",
            "format": "SOCKET",
            "power_type": "AC_3_PHASE",
            "max_voltage": 230,
            "max_amperage": 32,
            "max_electric_power": 22000,
            "tariff_ids": ["TARIFF-A1", "TARIFF-A2"],
            "terms_and_conditions": "https://example.com/terms",
            "last_updated": "2025-01-01T00:00:00Z"
          },
          {
            "id": "2",
            "standard": "IEC_62196_T2_COMBO",
            "format": "CABLE",
            "power_type": "DC",
            "max_voltage": 400,
            "max_amperage": 125,
            "max_electric_power": 50000,
            "tariff_ids": ["TARIFF-B1"],
            "last_updated": "2025-01-01T00:00:00Z"
          }
        ],
        "floor_level": "-1",
        "physical_reference": "P1",
        "parking_restrictions": ["EV_ONLY"],
        "last_updated": "2025-01-01T00:00:00Z"
      }
    ],
    "last_updated": "2025-01-01T00:00:00Z"
  }' > /dev/null

echo ""
echo -e "  ${DIM}Base location created. Starting tests...${RESET}"

# ===========================================================================
# PHASE 1 — Connector GET: full field round-trip
# ===========================================================================

separator "1. GET /LOC-PATCH-001/EVSE-A/1 — Full connector round-trip"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
assert_ocpi_success "$body" "GET connector"
assert_field   "$body" "data.id"                    "1"
assert_field   "$body" "data.standard"              "IEC_62196_T2"
assert_field   "$body" "data.format"                "SOCKET"
assert_field   "$body" "data.power_type"            "AC_3_PHASE"
assert_field   "$body" "data.max_voltage"           "230"
assert_field   "$body" "data.max_amperage"          "32"
assert_field   "$body" "data.max_electric_power"    "22000"
assert_field   "$body" "data.terms_and_conditions"  "https://example.com/terms"
assert_contains "$body" "data.tariff_ids"           "TARIFF-A1"
assert_contains "$body" "data.tariff_ids"           "TARIFF-A2"

separator "2. GET /LOC-PATCH-001/EVSE-A/2 — Second connector round-trip"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/2" "${OCPI_HEADERS[@]}")
assert_ocpi_success "$body" "GET connector 2"
assert_field   "$body" "data.id"                    "2"
assert_field   "$body" "data.standard"              "IEC_62196_T2_COMBO"
assert_field   "$body" "data.format"                "CABLE"
assert_field   "$body" "data.power_type"            "DC"
assert_field   "$body" "data.max_voltage"           "400"
assert_field   "$body" "data.max_amperage"          "125"
assert_field   "$body" "data.max_electric_power"    "50000"
assert_contains "$body" "data.tariff_ids"           "TARIFF-B1"

# ===========================================================================
# PHASE 2 — PUT connector: replace all fields
# ===========================================================================

separator "3. PUT /LOC-PATCH-001/EVSE-A/1 — Replace connector 1 entirely"
do_curl 200 \
  -X PUT "$BASE_URL/LOC-PATCH-001/EVSE-A/1" \
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
    "terms_and_conditions": "https://example.com/new-terms",
    "last_updated": "2025-02-01T10:00:00Z"
  }' > /dev/null

separator "4. GET /LOC-PATCH-001/EVSE-A/1 — Assert connector 1 fully replaced"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.id"                    "1"
assert_field   "$body" "data.standard"              "IEC_62196_T2"
assert_field   "$body" "data.format"                "CABLE"
assert_field   "$body" "data.power_type"            "AC_1_PHASE"
assert_field   "$body" "data.max_voltage"           "230"
assert_field   "$body" "data.max_amperage"          "16"
assert_field   "$body" "data.max_electric_power"    "3680"
assert_field   "$body" "data.terms_and_conditions"  "https://example.com/new-terms"
assert_contains "$body" "data.tariff_ids"           "TARIFF-REPLACED"
assert_not_contains "$body" "data.tariff_ids"       "TARIFF-A1"
assert_not_contains "$body" "data.tariff_ids"       "TARIFF-A2"

# ===========================================================================
# PHASE 3 — PATCH connector: partial updates, field by field
# ===========================================================================

separator "5. PATCH /LOC-PATCH-001/EVSE-A/1 — Update tariff_ids only"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["TARIFF-NEW-X", "TARIFF-NEW-Y"],
    "last_updated": "2025-02-15T08:00:00Z"
  }' > /dev/null

separator "6. GET /LOC-PATCH-001/EVSE-A/1 — Assert tariff patched, other fields unchanged"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_contains    "$body" "data.tariff_ids"        "TARIFF-NEW-X"
assert_contains    "$body" "data.tariff_ids"        "TARIFF-NEW-Y"
assert_not_contains "$body" "data.tariff_ids"       "TARIFF-REPLACED"
echo "  -- unchanged --"
assert_field   "$body" "data.standard"              "IEC_62196_T2"
assert_field   "$body" "data.format"                "CABLE"
assert_field   "$body" "data.power_type"            "AC_1_PHASE"
assert_field   "$body" "data.max_voltage"           "230"
assert_field   "$body" "data.max_amperage"          "16"
assert_field   "$body" "data.max_electric_power"    "3680"
assert_field   "$body" "data.terms_and_conditions"  "https://example.com/new-terms"

separator "7. PATCH /LOC-PATCH-001/EVSE-A/1 — Update power fields only"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "max_voltage": 400,
    "max_amperage": 63,
    "max_electric_power": 43000,
    "last_updated": "2025-02-15T09:00:00Z"
  }' > /dev/null

separator "8. GET /LOC-PATCH-001/EVSE-A/1 — Assert power fields patched, tariff unchanged"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_field   "$body" "data.max_voltage"           "400"
assert_field   "$body" "data.max_amperage"          "63"
assert_field   "$body" "data.max_electric_power"    "43000"
echo "  -- unchanged --"
assert_field   "$body" "data.standard"              "IEC_62196_T2"
assert_field   "$body" "data.format"                "CABLE"
assert_contains "$body" "data.tariff_ids"           "TARIFF-NEW-X"
assert_field   "$body" "data.terms_and_conditions"  "https://example.com/new-terms"

separator "9. PATCH /LOC-PATCH-001/EVSE-A/1 — Update terms_and_conditions only"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "terms_and_conditions": "https://example.com/terms-v2",
    "last_updated": "2025-02-15T10:00:00Z"
  }' > /dev/null

separator "10. GET /LOC-PATCH-001/EVSE-A/1 — Assert terms patched, power unchanged"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/1" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_field   "$body" "data.terms_and_conditions"  "https://example.com/terms-v2"
echo "  -- unchanged --"
assert_field   "$body" "data.max_voltage"           "400"
assert_field   "$body" "data.max_amperage"          "63"
assert_contains "$body" "data.tariff_ids"           "TARIFF-NEW-X"

# ===========================================================================
# PHASE 4 — PATCH idempotency: patch same value twice, result must be same
# ===========================================================================

separator "11. PATCH /LOC-PATCH-001/EVSE-A/2 — Set tariff_ids (first time)"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A/2" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["TARIFF-IDEMPOTENT"],
    "last_updated": "2025-03-01T10:00:00Z"
  }' > /dev/null

separator "12. PATCH /LOC-PATCH-001/EVSE-A/2 — Set same tariff_ids again (idempotent)"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A/2" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["TARIFF-IDEMPOTENT"],
    "last_updated": "2025-03-01T11:00:00Z"
  }' > /dev/null

separator "13. GET /LOC-PATCH-001/EVSE-A/2 — Assert idempotent result"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/2" "${OCPI_HEADERS[@]}")
assert_length  "$body" "data.tariff_ids"            "1"
assert_contains "$body" "data.tariff_ids"           "TARIFF-IDEMPOTENT"

# ===========================================================================
# PHASE 5 — PATCH cascade: connector patch must update EVSE + Location last_updated
# Per OCPI 2.2.1 spec section 8.2.2.3
# ===========================================================================

separator "14. Capture last_updated of EVSE-A and LOC-PATCH-001 before connector patch"
loc_body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001" "${OCPI_HEADERS[@]}")
evse_body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
loc_ts_before=$(get_field "$loc_body" "data.last_updated")
evse_ts_before=$(get_field "$evse_body" "data.last_updated")
echo -e "  ${DIM}Location last_updated before: $loc_ts_before${RESET}"
echo -e "  ${DIM}EVSE-A last_updated before:   $evse_ts_before${RESET}"

separator "15. PATCH /LOC-PATCH-001/EVSE-A/1 — Trigger cascade timestamp update"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["TARIFF-CASCADE"],
    "last_updated": "2025-06-01T12:00:00Z"
  }' > /dev/null

separator "16. GET EVSE-A and LOC-PATCH-001 — Assert cascade last_updated"
loc_body_after=$(do_curl 200 "$BASE_URL/LOC-PATCH-001" "${OCPI_HEADERS[@]}")
evse_body_after=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
loc_ts_after=$(get_field "$loc_body_after" "data.last_updated")
evse_ts_after=$(get_field "$evse_body_after" "data.last_updated")
assert_different "Location last_updated (connector patch cascade)" "$loc_ts_before" "$loc_ts_after"
assert_different "EVSE-A last_updated (connector patch cascade)"   "$evse_ts_before" "$evse_ts_after"

# ===========================================================================
# PHASE 6 — PATCH cascade: EVSE patch must update Location last_updated
# ===========================================================================

separator "17. Capture Location last_updated before EVSE patch"
loc_body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001" "${OCPI_HEADERS[@]}")
loc_ts_before=$(get_field "$loc_body" "data.last_updated")
echo -e "  ${DIM}Location last_updated before: $loc_ts_before${RESET}"

separator "18. PATCH /LOC-PATCH-001/EVSE-A — Trigger EVSE→Location cascade"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "OUT_OF_ORDER",
    "last_updated": "2025-07-01T09:00:00Z"
  }' > /dev/null

separator "19. GET LOC-PATCH-001 — Assert Location last_updated cascaded from EVSE patch"
loc_body_after=$(do_curl 200 "$BASE_URL/LOC-PATCH-001" "${OCPI_HEADERS[@]}")
loc_ts_after=$(get_field "$loc_body_after" "data.last_updated")
assert_different "Location last_updated (EVSE patch cascade)" "$loc_ts_before" "$loc_ts_after"
echo "  -- EVSE status unchanged check --"
evse_body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
assert_field "$evse_body" "data.status" "OUT_OF_ORDER"

# ===========================================================================
# PHASE 7 — PATCH EVSE: partial field updates
# ===========================================================================

separator "20. PATCH /LOC-PATCH-001/EVSE-A — Update capabilities only"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": ["CHARGING_PROFILE_CAPABLE", "CREDIT_CARD_PAYABLE"],
    "last_updated": "2025-07-02T10:00:00Z"
  }' > /dev/null

separator "21. GET /LOC-PATCH-001/EVSE-A — Assert capabilities patched, status unchanged"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_contains "$body" "data.capabilities"        "CHARGING_PROFILE_CAPABLE"
assert_contains "$body" "data.capabilities"        "CREDIT_CARD_PAYABLE"
assert_not_contains "$body" "data.capabilities"    "RFID_READER"
echo "  -- unchanged --"
assert_field   "$body" "data.status"               "OUT_OF_ORDER"
assert_field   "$body" "data.floor_level"          "-1"
assert_field   "$body" "data.physical_reference"   "P1"
assert_length  "$body" "data.connectors"           "2"

separator "22. PATCH /LOC-PATCH-001/EVSE-A — Update parking_restrictions only"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "parking_restrictions": ["EV_ONLY", "CUSTOMERS"],
    "last_updated": "2025-07-02T11:00:00Z"
  }' > /dev/null

separator "23. GET /LOC-PATCH-001/EVSE-A — Assert parking_restrictions patched"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_contains "$body" "data.parking_restrictions" "EV_ONLY"
assert_contains "$body" "data.parking_restrictions" "CUSTOMERS"
echo "  -- unchanged --"
assert_contains "$body" "data.capabilities"         "CHARGING_PROFILE_CAPABLE"
assert_field   "$body" "data.status"                "OUT_OF_ORDER"

# ===========================================================================
# PHASE 8 — PATCH Location: partial field updates
# ===========================================================================

separator "24. PATCH /LOC-PATCH-001 — Update operator only"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "operator": { "name": "NewOperator", "website": "https://newoperator.example.com" },
    "last_updated": "2025-08-01T08:00:00Z"
  }' > /dev/null

separator "25. GET /LOC-PATCH-001 — Assert operator patched, address unchanged"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_field   "$body" "data.operator.name"         "NewOperator"
echo "  -- unchanged --"
assert_field   "$body" "data.name"                  "Connector Test Location"
assert_field   "$body" "data.address"               "42 Avenue des Tests"
assert_field   "$body" "data.city"                  "Lyon"
assert_field   "$body" "data.parking_type"          "PARKING_GARAGE"

separator "26. PATCH /LOC-PATCH-001 — Update publish to false"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "publish": false,
    "last_updated": "2025-08-01T09:00:00Z"
  }' > /dev/null

separator "27. GET /LOC-PATCH-001 — Assert publish changed to false"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.publish"               "false"
assert_field   "$body" "data.operator.name"         "NewOperator"

separator "28. PATCH /LOC-PATCH-001 — Restore publish to true"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "publish": true,
    "last_updated": "2025-08-01T10:00:00Z"
  }' > /dev/null

separator "29. GET /LOC-PATCH-001 — Assert publish restored to true"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.publish"               "true"

# ===========================================================================
# PHASE 9 — Add a third connector via PUT, then PATCH it
# ===========================================================================

separator "30. PUT /LOC-PATCH-001/EVSE-A/3 — Add third connector"
do_curl 200 \
  -X PUT "$BASE_URL/LOC-PATCH-001/EVSE-A/3" \
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
    "last_updated": "2025-09-01T08:00:00Z"
  }' > /dev/null

separator "31. GET /LOC-PATCH-001/EVSE-A/3 — Assert connector 3 created"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/3" "${OCPI_HEADERS[@]}")
assert_field   "$body" "data.id"                    "3"
assert_field   "$body" "data.standard"              "CHADEMO"
assert_field   "$body" "data.format"                "CABLE"
assert_field   "$body" "data.max_voltage"           "500"
assert_contains "$body" "data.tariff_ids"           "TARIFF-C1"

separator "32. GET /LOC-PATCH-001/EVSE-A — Assert EVSE now has 3 connectors"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A" "${OCPI_HEADERS[@]}")
assert_length  "$body" "data.connectors"            "3"

separator "33. PATCH /LOC-PATCH-001/EVSE-A/3 — Update connector 3 amperage"
do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A/3" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "max_amperage": 200,
    "max_electric_power": 100000,
    "last_updated": "2025-09-01T09:00:00Z"
  }' > /dev/null

separator "34. GET /LOC-PATCH-001/EVSE-A/3 — Assert amperage patched, standard unchanged"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/3" "${OCPI_HEADERS[@]}")
echo "  -- patched --"
assert_field   "$body" "data.max_amperage"          "200"
assert_field   "$body" "data.max_electric_power"    "100000"
echo "  -- unchanged --"
assert_field   "$body" "data.standard"              "CHADEMO"
assert_field   "$body" "data.format"                "CABLE"
assert_field   "$body" "data.max_voltage"           "500"
assert_contains "$body" "data.tariff_ids"           "TARIFF-C1"

# ===========================================================================
# PHASE 10 — Error cases
# ===========================================================================

separator "35. PATCH /LOC-PATCH-001/EVSE-A/1 — Missing last_updated (expect error)"
body=$(do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "tariff_ids": ["SHOULD-FAIL"] }')
assert_ocpi_error "$body" "PATCH connector without last_updated"

separator "36. PATCH /LOC-PATCH-001/EVSE-A — Missing last_updated (expect error)"
body=$(do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-A" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "status": "AVAILABLE" }')
assert_ocpi_error "$body" "PATCH EVSE without last_updated"

separator "37. PATCH /LOC-PATCH-001 — Missing last_updated (expect error)"
body=$(do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{ "name": "No timestamp" }')
assert_ocpi_error "$body" "PATCH location without last_updated"

separator "38. GET /LOC-PATCH-001/EVSE-A/99 — Non-existent connector (expect error)"
body=$(do_curl 200 "$BASE_URL/LOC-PATCH-001/EVSE-A/99" "${OCPI_HEADERS[@]}")
assert_ocpi_error "$body" "GET unknown connector"

separator "39. PATCH /LOC-PATCH-001/EVSE-Z/1 — Non-existent EVSE (expect error)"
body=$(do_curl 200 \
  -X PATCH "$BASE_URL/LOC-PATCH-001/EVSE-Z/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["SHOULD-FAIL"],
    "last_updated": "2025-09-01T10:00:00Z"
  }')
assert_ocpi_error "$body" "PATCH connector on non-existent EVSE"

separator "40. PATCH /LOC-DOES-NOT-EXIST/EVSE-A/1 — Non-existent location (expect error)"
body=$(do_curl 200 \
  -X PATCH "$BASE_URL/LOC-DOES-NOT-EXIST/EVSE-A/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "tariff_ids": ["SHOULD-FAIL"],
    "last_updated": "2025-09-01T10:00:00Z"
  }')
assert_ocpi_error "$body" "PATCH connector on non-existent location"

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