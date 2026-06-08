#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# CDRs module OCPI 2.2.1 - Receiver Interface tests
#
# Covers scenarios for the eMSP Receiver endpoint:
#   CDR-1  POST a minimal valid CDR and assert Location header returned
#   CDR-2  GET the CDR via the URL from the POST Location header
#   CDR-3  Full field validation on the retrieved CDR
#   CDR-4  POST a CDR with all optional fields populated
#   CDR-5  POST a Credit CDR referencing the original
#   CDR-6  GET the Credit CDR and assert credit / credit_reference_id fields
#   CDR-7  PUT on CDR endpoint returns 405 / OCPI error (CDRs are immutable)
#   CDR-8  PATCH on CDR endpoint returns 405 / OCPI error (CDRs are immutable)
#   CDR-9  DELETE on CDR endpoint returns 405 / OCPI error (CDRs cannot be removed)
#   CDR-10 POST a duplicate CDR id (same country_code/party_id/id) returns OCPI error
#   CDR-11 POST CDR with missing required field returns OCPI error
#   CDR-12 POST CDR with multiple ChargingPeriods — assert all periods stored
#   CDR-13 POST CDR with signed_data — assert SignedData fields preserved
#   CDR-14 POST home_charging_compensation CDR
#   CDR-15 POST reservation-only CDR (no session_id, evse_uid=#NA)
#
# Usage:
#   chmod +x cdrs-receiver-test.sh
#   ./cdrs-receiver-test.sh
#
# Environment overrides:
#   OCPI_BASE          base URL              (default: http://127.0.0.1:8085/ocpi)
#   OCPI_VERSION       OCPI version string   (default: 2.2.1)
#   AUTH_TOKEN         bearer token          (default: see below)

OCPI_BASE="${OCPI_BASE:-http://127.0.0.1:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
RECEIVER_PREFIX="$OCPI_BASE/emsp/$OCPI_VERSION"
CDR_ENDPOINT="$RECEIVER_PREFIX/cdrs"

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
 
# ---------------------------------------------------------------------------
# Terminal colours
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
 
PASS=0
FAIL=0
 
# Directory used to pass Location URLs out of subshells.
# do_post_cdr writes  $CDR_URL_DIR/<label>  with the URL text.
# get_location_url <label>  reads it back in the parent shell.
CDR_URL_DIR=$(mktemp -d)
trap 'rm -rf "$CDR_URL_DIR"' EXIT
 
get_location_url() {
  local label="$1"
  local f="$CDR_URL_DIR/$label"
  [ -f "$f" ] && cat "$f" || echo ""
}
 
# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
 
separator() {
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}  $1${RESET}"
  echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
}
 
# do_post_cdr <expected_http> <cdr_id_label> <json_body>
# Performs POST to $CDR_ENDPOINT, captures the Location response header,
# writes the Location URL to $CDR_URL_DIR/$cdr_id_label, echoes the body.
do_post_cdr() {
  local expected_http="$1"
  local label="$2"
  local json_body="$3"
 
  local tmp_body tmp_headers
  tmp_body=$(mktemp)
  tmp_headers=$(mktemp)
 
  local http_code
  http_code=$(curl -sS \
    -w "%{http_code}" \
    -D "$tmp_headers" \
    -o "$tmp_body" \
    -X POST "$CDR_ENDPOINT" \
    "${OCPI_HEADERS[@]}" \
    -H "X-Request-ID: $(uuidgen 2>/dev/null || echo req-post-$label)" \
    -H "X-Correlation-ID: $(uuidgen 2>/dev/null || echo corr-post-$label)" \
    -d "$json_body" 2>&1) || {
      echo -e "${RED}  Connection error — is the server running?${RESET}" >&2
      FAIL=$((FAIL + 1))
      rm -f "$tmp_body" "$tmp_headers"
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
 
  # Extract Location header and persist to a file so the parent shell can read it
  # (do_post_cdr runs inside $(...), i.e. a subshell — array writes would be lost)
  local location
  location=$(grep -i "^location:" "$tmp_headers" | head -1 | tr -d '\r' | sed 's/^[Ll]ocation: *//')
  if [ -n "$location" ]; then
    echo "$location" > "$CDR_URL_DIR/$label"
    echo -e "  ${DIM}Location: $location${RESET}" >&2
  fi
 
  local body
  body=$(cat "$tmp_body")
  rm -f "$tmp_body" "$tmp_headers"
  echo "$body"
}
 
# do_curl_method <method> <expected_http> <url> [extra curl args...]
do_curl_method() {
  local method="$1"
  local expected_http="$2"
  local url="$3"
  shift 3
 
  local tmp
  tmp=$(mktemp)
 
  local http_code
  http_code=$(curl -sS \
    -w "%{http_code}" \
    -o "$tmp" \
    -X "$method" "$url" \
    "${OCPI_HEADERS[@]}" \
    -H "X-Request-ID: $(uuidgen 2>/dev/null || echo req-$method)" \
    -H "X-Correlation-ID: $(uuidgen 2>/dev/null || echo corr-$method)" \
    "$@" 2>&1) || {
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
 
# ---- field assertion helpers -----------------------------------------------
 
assert_field() {
  local body="$1" path="$2" expected="$3"
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
 
assert_float() {
  local body="$1" path="$2" expected="$3"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = '$path'.split('.')
val = data
try:
    for k in keys:
        val = val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print('$expected' if abs(float(val) - float('$expected')) < 1e-9 else float(val))
except (KeyError, IndexError, TypeError, ValueError):
    print('__MISSING__')
" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} ≈ ${GREEN}$expected${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected ${GREEN}$expected${RESET}, got ${RED}$actual${RESET}"
    FAIL=$((FAIL + 1))
  fi
}
 
assert_length() {
  local body="$1" path="$2" expected="$3"
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
 
assert_null_or_missing() {
  local body="$1" path="$2"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = '$path'.split('.')
val = data
try:
    for k in keys:
        val = val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print('null' if val is None else str(val))
except (KeyError, IndexError, TypeError):
    print('__MISSING__')
" 2>/dev/null)
  if [ "$actual" = "__MISSING__" ] || [ "$actual" = "null" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} is null/missing (as expected)"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected null/missing, got ${RED}$actual${RESET}"
    FAIL=$((FAIL + 1))
  fi
}

assert_datetime() {
  local body="$1"
  local field="$2"
  local expected="$3"

  local actual
  actual=$(echo "$body" | jq -r ".$field")

  # Normalize both to seconds-since-epoch for comparison
  local expected_ts actual_ts
  expected_ts=$(date -d "$expected" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$expected" +%s)
  actual_ts=$(date -d "$actual" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S%z" "$actual" +%s)

  if [ "$expected_ts" = "$actual_ts" ]; then
    echo "  ✓ $field: $actual"
  else
    echo "  ✗ $field: expected $expected, got $actual"
    FAILED=$((FAILED + 1))
  fi
}
 
assert_not_empty() {
  local body="$1" path="$2"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = '$path'.split('.')
val = data
try:
    for k in keys:
        val = val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print('__EMPTY__' if val is None or val == '' else 'ok')
except (KeyError, IndexError, TypeError):
    print('__MISSING__')
" 2>/dev/null)
  if [ "$actual" = "ok" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} is present and non-empty"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected non-empty value, got ${RED}$actual${RESET}"
    FAIL=$((FAIL + 1))
  fi
}
 
assert_boolean() {
  local body="$1" path="$2" expected="$3"   # expected: "true" or "false"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys, json
data = json.load(sys.stdin)
keys = '$path'.split('.')
val = data
try:
    for k in keys:
        val = val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print(str(val).lower())
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
 
assert_location_header_present() {
  local label="$1"
  local url
  url=$(get_location_url "$label")
  if [ -n "$url" ]; then
    echo -e "    ${GREEN}✓${RESET} Location header present: ${DIM}$url${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} Location header missing for CDR '$label'"
    FAIL=$((FAIL + 1))
  fi
}
 
assert_ocpi_success() {
  local body="$1" label="$2"
  local code
  code=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status_code',''))" 2>/dev/null)
  if [ "$code" = "1000" ]; then
    echo -e "    ${GREEN}✓${RESET} $label — OCPI status_code 1000"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} $label — expected 1000, got $code"
    FAIL=$((FAIL + 1))
  fi
}
 
assert_ocpi_error() {
  local body="$1" label="$2"
  local code
  code=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status_code',''))" 2>/dev/null)
  if [ "$code" != "1000" ] && [ -n "$code" ]; then
    echo -e "    ${GREEN}✓${RESET} $label — OCPI status_code $code (error as expected)"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} $label — expected OCPI error status_code, got '$code'"
    FAIL=$((FAIL + 1))
  fi
}
 
# ===========================================================================
# Shared CDR fixtures
# ===========================================================================
 
CDR_MINIMAL_ID="CDR-MINIMAL-001"
CDR_FULL_ID="CDR-FULL-001"
CDR_ORIGINAL_ID="CDR-ORIG-001"
CDR_CREDIT_ID="CDR-ORIG-001-C"
CDR_MULTIPERIOD_ID="CDR-MULTIPERIOD-001"
CDR_SIGNED_ID="CDR-SIGNED-001"
CDR_HOME_ID="CDR-HOME-001"
CDR_RESERVATION_ID="CDR-RESERVATION-001"
 
MINIMAL_CDR_JSON=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "108",
  "id": "CDR-MINIMAL-001",
  "start_date_time": "2025-03-10T08:00:00Z",
  "end_date_time": "2025-03-10T09:00:00Z",
  "session_id": "SESSION-MINIMAL-001",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "TNM",
    "uid": "RFID-MINIMAL-001",
    "type": "RFID",
    "contract_id": "DE8ACC12E46L89"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-MINIMAL",
    "address": "1 Rue de la Paix",
    "city": "Paris",
    "country": "FRA",
    "coordinates": { "latitude": "48.869888", "longitude": "2.331440" },
    "evse_uid": "EVSE-MIN-001",
    "evse_id": "BE*BEC*E041503001",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "108",
      "id": "TARIFF-MIN-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.25, "vat": 20.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-03-10T08:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 10.5 } ],
      "tariff_id": "TARIFF-MIN-01"
    }
  ],
  "total_cost": { "excl_vat": 2.625, "incl_vat": 3.15 },
  "total_energy": 10.5,
  "total_time": 1.0,
  "last_updated": "2025-03-10T09:05:00Z"
}
EOF
)
 
FULL_CDR_JSON=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "108",
  "id": "CDR-FULL-001",
  "start_date_time": "2025-04-01T14:00:00Z",
  "end_date_time": "2025-04-01T16:30:00Z",
  "session_id": "SESSION-FULL-001",
  "cdr_token": {
    "country_code": "NL",
    "party_id": "ALX",
    "uid": "APP-TOKEN-FULL-001",
    "type": "APP_USER",
    "contract_id": "NL-ALX-APP-FULL-001"
  },
  "auth_method": "AUTH_REQUEST",
  "authorization_reference": "AUTH-REF-FULL-001",
  "cdr_location": {
    "id": "LOC-FULL",
    "name": "Brussels Central Station",
    "address": "Carrefour de l'Europe 2",
    "city": "Brussels",
    "postal_code": "1000",
    "state": "Brussels",
    "country": "BEL",
    "coordinates": { "latitude": "50.846557", "longitude": "4.356470" },
    "evse_uid": "EVSE-FULL-001",
    "evse_id": "BE*BEC*E041503099",
    "connector_id": "2",
    "connector_standard": "IEC_62196_T2_COMBO",
    "connector_format": "CABLE",
    "connector_power_type": "DC"
  },
  "meter_id": "METER-FULL-ABC123",
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "108",
      "id": "TARIFF-FULL-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "FLAT",         "price": 0.50,  "vat": 21.0, "step_size": 1   } ] },
        { "price_components": [ { "type": "ENERGY",       "price": 0.30,  "vat": 21.0, "step_size": 1   } ] },
        { "price_components": [ { "type": "PARKING_TIME", "price": 0.10,  "vat": 21.0, "step_size": 300 } ] }
      ],
      "last_updated": "2025-01-15T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-04-01T14:00:00Z",
      "dimensions": [
        { "type": "ENERGY", "volume": 22.5 },
        { "type": "MAX_CURRENT", "volume": 63.0 }
      ],
      "tariff_id": "TARIFF-FULL-01"
    },
    {
      "start_date_time": "2025-04-01T15:45:00Z",
      "dimensions": [ { "type": "PARKING_TIME", "volume": 0.75 } ],
      "tariff_id": "TARIFF-FULL-01"
    }
  ],
  "total_cost":            { "excl_vat": 7.925, "incl_vat": 9.589 },
  "total_fixed_cost":      { "excl_vat": 0.50,  "incl_vat": 0.605 },
  "total_energy":          22.5,
  "total_energy_cost":     { "excl_vat": 6.75,  "incl_vat": 8.168 },
  "total_time":            2.5,
  "total_time_cost":       { "excl_vat": 0.00,  "incl_vat": 0.00  },
  "total_parking_time":    0.75,
  "total_parking_cost":    { "excl_vat": 0.075, "incl_vat": 0.091 },
  "remark":                "DC fast charge at Brussels Central",
  "invoice_reference_id":  "INV-2025-04-FULL-001",
  "last_updated": "2025-04-01T16:35:00Z"
}
EOF
)
 
ORIGINAL_CDR_JSON=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "108",
  "id": "CDR-ORIG-001",
  "start_date_time": "2025-05-01T10:00:00Z",
  "end_date_time": "2025-05-01T11:00:00Z",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "EMP",
    "uid": "RFID-ORIG-001",
    "type": "RFID",
    "contract_id": "DE-EMP-ORIG-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-CREDIT",
    "address": "10 Avenue des Champs",
    "city": "Paris",
    "country": "FRA",
    "coordinates": { "latitude": "48.873792", "longitude": "2.295972" },
    "evse_uid": "EVSE-ORIG-001",
    "evse_id": "BE*BEC*E041503010",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "108",
      "id": "TARIFF-CREDIT-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "TIME", "price": 2.00, "vat": 10.0, "step_size": 300 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-05-01T10:00:00Z",
      "dimensions": [ { "type": "TIME", "volume": 1.0 } ],
      "tariff_id": "TARIFF-CREDIT-01"
    }
  ],
  "total_cost":   { "excl_vat": 2.00, "incl_vat": 2.20 },
  "total_energy": 0.0,
  "total_time":   1.0,
  "last_updated": "2025-05-01T11:05:00Z"
}
EOF
)
 
CREDIT_CDR_JSON=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "108",
  "id": "CDR-ORIG-001-C",
  "start_date_time": "2025-05-01T10:00:00Z",
  "end_date_time": "2025-05-01T11:00:00Z",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "EMP",
    "uid": "RFID-ORIG-001",
    "type": "RFID",
    "contract_id": "DE-EMP-ORIG-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-CREDIT",
    "address": "10 Avenue des Champs",
    "city": "Paris",
    "country": "FRA",
    "coordinates": { "latitude": "48.873792", "longitude": "2.295972" },
    "evse_uid": "EVSE-ORIG-001",
    "evse_id": "BE*BEC*E041503010",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "108",
      "id": "TARIFF-CREDIT-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "TIME", "price": 2.00, "vat": 10.0, "step_size": 300 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-05-01T10:00:00Z",
      "dimensions": [ { "type": "TIME", "volume": 1.0 } ],
      "tariff_id": "TARIFF-CREDIT-01"
    }
  ],
  "total_cost":            { "excl_vat": -2.00, "incl_vat": -2.20 },
  "total_energy":          0.0,
  "total_time":            1.0,
  "credit":                true,
  "credit_reference_id":   "CDR-ORIG-001",
  "last_updated": "2025-05-05T09:00:00Z"
}
EOF
)
 
MULTIPERIOD_CDR_JSON=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "108",
  "id": "CDR-MULTIPERIOD-001",
  "start_date_time": "2025-06-01T16:00:00Z",
  "end_date_time": "2025-06-01T19:00:00Z",
  "session_id": "SESSION-MULTI-001",
  "cdr_token": {
    "country_code": "FR",
    "party_id": "MSP",
    "uid": "RFID-MULTI-001",
    "type": "RFID",
    "contract_id": "FR-MSP-MULTI-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-MULTI",
    "address": "5 Place de la République",
    "city": "Lyon",
    "country": "FRA",
    "coordinates": { "latitude": "45.766944", "longitude": "4.833611" },
    "evse_uid": "EVSE-MULTI-001",
    "evse_id": "BE*BEC*E041503020",
    "connector_id": "3",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "108",
      "id": "TARIFF-MULTI-01",
      "currency": "EUR",
      "elements": [
        {
          "price_components": [ { "type": "ENERGY", "price": 0.20, "vat": 20.0, "step_size": 1 } ],
          "restrictions": { "end_time": "17:00" }
        },
        {
          "price_components": [ { "type": "ENERGY", "price": 0.27, "vat": 20.0, "step_size": 1 } ],
          "restrictions": { "start_time": "17:00" }
        }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-06-01T16:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 4.3 }, { "type": "MAX_CURRENT", "volume": 16.0 } ],
      "tariff_id": "TARIFF-MULTI-01"
    },
    {
      "start_date_time": "2025-06-01T17:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 1.1 }, { "type": "MAX_CURRENT", "volume": 16.0 } ],
      "tariff_id": "TARIFF-MULTI-01"
    },
    {
      "start_date_time": "2025-06-01T17:30:00Z",
      "dimensions": [ { "type": "PARKING_TIME", "volume": 1.5 } ],
      "tariff_id": "TARIFF-MULTI-01"
    }
  ],
  "total_cost":         { "excl_vat": 1.157, "incl_vat": 1.388 },
  "total_energy":       5.4,
  "total_energy_cost":  { "excl_vat": 1.157, "incl_vat": 1.388 },
  "total_time":         3.0,
  "total_parking_time": 1.5,
  "last_updated": "2025-06-01T19:05:00Z"
}
EOF
)
 
SIGNED_CDR_JSON=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "108",
  "id": "CDR-SIGNED-001",
  "start_date_time": "2025-07-01T09:00:00Z",
  "end_date_time": "2025-07-01T10:00:00Z",
  "session_id": "SESSION-SIGNED-001",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "EMP",
    "uid": "RFID-SIGNED-001",
    "type": "RFID",
    "contract_id": "DE-EMP-SIGNED-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-SIGNED",
    "address": "Unter den Linden 1",
    "city": "Berlin",
    "country": "DEU",
    "coordinates": { "latitude": "52.516667", "longitude": "13.383333" },
    "evse_uid": "EVSE-SIGNED-001",
    "evse_id": "DE*CPO*E041503030",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2_COMBO",
    "connector_format": "CABLE",
    "connector_power_type": "DC"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "DE",
      "party_id": "CPO",
      "id": "TARIFF-SIGNED-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.35, "vat": 19.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-07-01T09:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 30.0 } ],
      "tariff_id": "TARIFF-SIGNED-01"
    }
  ],
  "signed_data": {
    "encoding_method": "OCMF",
    "encoding_method_version": 1,
    "public_key": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEfakePublicKeyBase64==",
    "signed_values": [
      {
        "nature": "Start",
        "plain_data": "START|2025-07-01T09:00:00Z|0.000kWh",
        "signed_data": "c2lnbmVkX3N0YXJ0X2RhdGFfYmFzZTY0X2VuY29kZWRfZmFrZQ=="
      },
      {
        "nature": "End",
        "plain_data": "END|2025-07-01T10:00:00Z|30.000kWh",
        "signed_data": "c2lnbmVkX2VuZF9kYXRhX2Jhc2U2NF9lbmNvZGVkX2Zha2U="
      }
    ],
    "url": "https://example.com/verify/CDR-SIGNED-001"
  },
  "total_cost":   { "excl_vat": 10.50, "incl_vat": 12.495 },
  "total_energy": 30.0,
  "total_time":   1.0,
  "last_updated": "2025-07-01T10:05:00Z"
}
EOF
)
 
HOME_CDR_JSON=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "108",
  "id": "CDR-HOME-001",
  "start_date_time": "2025-08-01T22:00:00Z",
  "end_date_time": "2025-08-02T06:00:00Z",
  "cdr_token": {
    "country_code": "NL",
    "party_id": "DRV",
    "uid": "APP-HOME-001",
    "type": "APP_USER",
    "contract_id": "NL-DRV-HOME-001"
  },
  "auth_method": "COMMAND",
  "cdr_location": {
    "id": "LOC-HOME-CHARGER",
    "address": "Private Road 7",
    "city": "Amsterdam",
    "country": "NLD",
    "coordinates": { "latitude": "52.370216", "longitude": "4.895168" },
    "evse_uid": "EVSE-HOME-001",
    "evse_id": "NL*DRV*EHOME001",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_1_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "108",
      "id": "TARIFF-HOME-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.22, "vat": 21.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-08-01T22:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 40.0 } ],
      "tariff_id": "TARIFF-HOME-01"
    }
  ],
  "total_cost":                  { "excl_vat": 8.80, "incl_vat": 10.648 },
  "total_energy":                40.0,
  "total_time":                  8.0,
  "home_charging_compensation":  true,
  "last_updated": "2025-08-02T06:05:00Z"
}
EOF
)
 
RESERVATION_CDR_JSON=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "108",
  "id": "CDR-RESERVATION-001",
  "start_date_time": "2025-09-01T12:00:00Z",
  "end_date_time": "2025-09-01T12:30:00Z",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "EMP",
    "uid": "RFID-RES-001",
    "type": "RFID",
    "contract_id": "DE-EMP-RES-001"
  },
  "auth_method": "COMMAND",
  "authorization_reference": "RESERVENOW-REF-001",
  "cdr_location": {
    "id": "LOC-RESERVATION",
    "address": "Station Road 1",
    "city": "Antwerp",
    "country": "BEL",
    "coordinates": { "latitude": "51.219448", "longitude": "4.402464" },
    "evse_uid": "#NA",
    "evse_id": "#NA",
    "connector_id": "#NA",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "108",
      "id": "TARIFF-RES-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "FLAT", "price": 1.00, "vat": 21.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-09-01T12:00:00Z",
      "dimensions": [ { "type": "RESERVATION_TIME", "volume": 0.5 } ],
      "tariff_id": "TARIFF-RES-01"
    }
  ],
  "total_cost":             { "excl_vat": 1.00, "incl_vat": 1.21 },
  "total_reservation_cost": { "excl_vat": 1.00, "incl_vat": 1.21 },
  "total_energy":           0.0,
  "total_time":             0.5,
  "remark":                 "Reservation expired without EV arriving",
  "last_updated": "2025-09-01T12:35:00Z"
}
EOF
)
 
# ===========================================================================
# CDR-1  POST minimal valid CDR
# ===========================================================================
 
separator "CDR-1. POST minimal CDR — expect HTTP 200 + Location header"
body=$(do_post_cdr 200 "$CDR_MINIMAL_ID" "$MINIMAL_CDR_JSON")
assert_ocpi_success        "$body" "POST minimal CDR"
assert_location_header_present "$CDR_MINIMAL_ID"
 
# ===========================================================================
# CDR-2  GET via Location URL and assert core identity fields
# ===========================================================================
 
separator "CDR-2. GET minimal CDR via Location URL — core identity"
if [ -n "$(get_location_url "$CDR_MINIMAL_ID")" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url "$CDR_MINIMAL_ID")")
  assert_ocpi_success "$body" "GET minimal CDR"
  assert_field  "$body" "data.id"           "$CDR_MINIMAL_ID"
  assert_field  "$body" "data.country_code" "FR"
  assert_field  "$body" "data.party_id"     "108"
else
  echo -e "  ${YELLOW}SKIP — no Location URL captured from CDR-1${RESET}"
fi
 
# ===========================================================================
# CDR-3  Full field validation on minimal CDR
# ===========================================================================
 
separator "CDR-3. Full field validation — minimal CDR"
if [ -n "$(get_location_url "$CDR_MINIMAL_ID")" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url "$CDR_MINIMAL_ID")")
 
  # Top-level timestamps
  assert_datetime "$body" "data.start_date_time"  "2025-03-10T08:00:00Z"
  assert_datetime "$body" "data.end_date_time"    "2025-03-10T09:00:00Z"
  assert_field "$body" "data.session_id"       "SESSION-MINIMAL-001"
  assert_field "$body" "data.auth_method"      "WHITELIST"
  assert_field "$body" "data.currency"         "EUR"
 
  # cdr_token
  assert_field "$body" "data.cdr_token.country_code" "DE"
  assert_field "$body" "data.cdr_token.party_id"     "TNM"
  assert_field "$body" "data.cdr_token.uid"          "RFID-MINIMAL-001"
  assert_field "$body" "data.cdr_token.type"         "RFID"
  assert_field "$body" "data.cdr_token.contract_id"  "DE8ACC12E46L89"
 
  # cdr_location
  assert_field "$body" "data.cdr_location.id"                   "LOC-MINIMAL"
  assert_field "$body" "data.cdr_location.address"              "1 Rue de la Paix"
  assert_field "$body" "data.cdr_location.city"                 "Paris"
  assert_field "$body" "data.cdr_location.country"              "FRA"
  assert_field "$body" "data.cdr_location.evse_uid"             "EVSE-MIN-001"
  assert_field "$body" "data.cdr_location.evse_id"              "BE*BEC*E041503001"
  assert_field "$body" "data.cdr_location.connector_id"         "1"
  assert_field "$body" "data.cdr_location.connector_standard"   "IEC_62196_T2"
  assert_field "$body" "data.cdr_location.connector_format"     "SOCKET"
  assert_field "$body" "data.cdr_location.connector_power_type" "AC_3_PHASE"
  assert_field "$body" "data.cdr_location.coordinates.latitude"  "48.869888"
  assert_field "$body" "data.cdr_location.coordinates.longitude" "2.331440"
 
  # tariffs
  assert_length "$body" "data.tariffs" "1"
  assert_field  "$body" "data.tariffs.0.id"       "TARIFF-MIN-01"
  assert_field  "$body" "data.tariffs.0.currency" "EUR"
  assert_field  "$body" "data.tariffs.0.elements.0.price_components.0.type"  "ENERGY"
  assert_float  "$body" "data.tariffs.0.elements.0.price_components.0.price" "0.25"
  assert_float  "$body" "data.tariffs.0.elements.0.price_components.0.vat"   "20.0"
 
  # charging_periods
  assert_length "$body" "data.charging_periods" "1"
  assert_datetime  "$body" "data.charging_periods.0.start_date_time"        "2025-03-10T08:00:00Z"
  assert_field  "$body" "data.charging_periods.0.dimensions.0.type"      "ENERGY"
  assert_float  "$body" "data.charging_periods.0.dimensions.0.volume"    "10.5"
  assert_field  "$body" "data.charging_periods.0.tariff_id"              "TARIFF-MIN-01"
 
  # totals
  assert_float  "$body" "data.total_energy"       "10.5"
  assert_float  "$body" "data.total_time"          "1.0"
  assert_float  "$body" "data.total_cost.excl_vat" "2.625"
  assert_float  "$body" "data.total_cost.incl_vat" "3.15"
 
  # optional fields absent
  assert_null_or_missing "$body" "data.meter_id"
  assert_null_or_missing "$body" "data.credit"
  assert_null_or_missing "$body" "data.credit_reference_id"
  assert_null_or_missing "$body" "data.home_charging_compensation"
 
  # last_updated present
  assert_not_empty "$body" "data.last_updated"
else
  echo -e "  ${YELLOW}SKIP — no Location URL${RESET}"
fi
 
# ===========================================================================
# CDR-4  POST CDR with all optional fields
# ===========================================================================
 
separator "CDR-4. POST full CDR (all optional fields)"
body=$(do_post_cdr 200 "$CDR_FULL_ID" "$FULL_CDR_JSON")
assert_ocpi_success           "$body" "POST full CDR"
assert_location_header_present "$CDR_FULL_ID"
 
separator "CDR-4b. GET full CDR — assert optional fields stored correctly"
if [ -n "$(get_location_url "$CDR_FULL_ID")" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url "$CDR_FULL_ID")")
  assert_ocpi_success "$body" "GET full CDR"
 
  assert_field  "$body" "data.id"                          "$CDR_FULL_ID"
  assert_field  "$body" "data.cdr_token.type"              "APP_USER"
  assert_field  "$body" "data.auth_method"                 "AUTH_REQUEST"
  assert_field  "$body" "data.authorization_reference"     "AUTH-REF-FULL-001"
  assert_field  "$body" "data.cdr_location.name"           "Brussels Central Station"
  assert_field  "$body" "data.cdr_location.postal_code"    "1000"
  assert_field  "$body" "data.cdr_location.state"          "Brussels"
  assert_field  "$body" "data.cdr_location.connector_standard" "IEC_62196_T2_COMBO"
  assert_field  "$body" "data.meter_id"                    "METER-FULL-ABC123"
  assert_float  "$body" "data.total_energy"                "22.5"
  assert_float  "$body" "data.total_time"                  "2.5"
  assert_float  "$body" "data.total_parking_time"          "0.75"
  assert_float  "$body" "data.total_fixed_cost.excl_vat"   "0.50"
  assert_float  "$body" "data.total_energy_cost.excl_vat"  "6.75"
  assert_float  "$body" "data.total_parking_cost.excl_vat" "0.075"
  assert_field  "$body" "data.remark"                      "DC fast charge at Brussels Central"
  assert_field  "$body" "data.invoice_reference_id"        "INV-2025-04-FULL-001"
 
  # 2 charging periods
  assert_length "$body" "data.charging_periods" "2"
  assert_field  "$body" "data.charging_periods.0.dimensions.0.type" "ENERGY"
  assert_field  "$body" "data.charging_periods.0.dimensions.1.type" "MAX_CURRENT"
  assert_float  "$body" "data.charging_periods.0.dimensions.1.volume" "63.0"
  assert_field  "$body" "data.charging_periods.1.dimensions.0.type" "PARKING_TIME"
fi
 
# ===========================================================================
# CDR-5  POST original CDR then Credit CDR
# ===========================================================================
 
separator "CDR-5a. POST original CDR (to be credited)"
body=$(do_post_cdr 200 "$CDR_ORIGINAL_ID" "$ORIGINAL_CDR_JSON")
assert_ocpi_success           "$body" "POST original CDR"
assert_location_header_present "$CDR_ORIGINAL_ID"
 
separator "CDR-5b. POST Credit CDR referencing original"
body=$(do_post_cdr 200 "$CDR_CREDIT_ID" "$CREDIT_CDR_JSON")
assert_ocpi_success           "$body" "POST credit CDR"
assert_location_header_present "$CDR_CREDIT_ID"
 
# ===========================================================================
# CDR-6  GET Credit CDR — validate credit fields
# ===========================================================================
 
separator "CDR-6. GET Credit CDR — assert credit fields"
if [ -n "$(get_location_url "$CDR_CREDIT_ID")" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url "$CDR_CREDIT_ID")")
  assert_ocpi_success "$body" "GET credit CDR"
 
  assert_field   "$body" "data.id"                    "$CDR_CREDIT_ID"
  assert_boolean "$body" "data.credit"                "true"
  assert_field   "$body" "data.credit_reference_id"   "$CDR_ORIGINAL_ID"
 
  # total_cost must be negative
  local_excl=$(echo "$body" | python3 -c "
import sys, json
val = json.load(sys.stdin)['data']['total_cost']['excl_vat']
print('negative' if float(val) < 0 else 'not_negative')
" 2>/dev/null)
  if [ "$local_excl" = "negative" ]; then
    echo -e "    ${GREEN}✓${RESET} data.total_cost.excl_vat is negative (credit)"
    PASS=$((PASS + 1))
  else
    echo -e "    ${RED}✗${RESET} data.total_cost.excl_vat: expected negative value for credit CDR"
    FAIL=$((FAIL + 1))
  fi
  assert_float "$body" "data.total_cost.excl_vat" "-2.00"
  assert_float "$body" "data.total_cost.incl_vat" "-2.20"
else
  echo -e "  ${YELLOW}SKIP — no Location URL${RESET}"
fi
 
# ===========================================================================
# CDR-7  PUT on CDR is not allowed (CDRs are immutable)
# ===========================================================================

separator "CDR-7. PUT on CDR endpoint — must return 405 (CDRs immutable)"
url=$(get_location_url "$CDR_MINIMAL_ID")
url="${url:-$CDR_ENDPOINT/CDR-MINIMAL-001}"
do_curl_method PUT 405 "$url" -d "$MINIMAL_CDR_JSON" > /dev/null
 
# ===========================================================================
# CDR-8  PATCH on CDR is not allowed
# ===========================================================================
 
separator "CDR-8. PATCH on CDR endpoint — must return 405 (CDRs immutable)"
url=$(get_location_url "$CDR_MINIMAL_ID")
url="${url:-$CDR_ENDPOINT/CDR-MINIMAL-001}"
do_curl_method PATCH 405 "$url" -d '{"remark":"attempt to patch"}' > /dev/null
 
# ===========================================================================
# CDR-9  DELETE on CDR is not allowed
# ===========================================================================
 
separator "CDR-9. DELETE on CDR endpoint — must return 405 (CDRs cannot be removed)"
url=$(get_location_url "$CDR_MINIMAL_ID")
url="${url:-$CDR_ENDPOINT/CDR-MINIMAL-001}"
do_curl_method DELETE 405 "$url" > /dev/null
 
 
# ===========================================================================
# CDR-10 POST duplicate CDR id — must return OCPI error
# ===========================================================================
 
separator "CDR-10. POST duplicate CDR id — must return OCPI error"
body=$(do_post_cdr 200 "__DUPLICATE__" "$MINIMAL_CDR_JSON")
assert_ocpi_error "$body" "Duplicate CDR id rejected"
 
# ===========================================================================
# CDR-11 POST with missing required field (total_cost omitted) — OCPI error
# ===========================================================================
 
separator "CDR-11. POST CDR missing required field (total_cost) — OCPI error"
MISSING_FIELD_JSON=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "108",
  "id": "CDR-MISSING-FIELD-001",
  "start_date_time": "2025-01-01T00:00:00Z",
  "end_date_time": "2025-01-01T01:00:00Z",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "EMP",
    "uid": "RFID-MISSING-001",
    "type": "RFID",
    "contract_id": "DE-EMP-MISSING-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-MISSING",
    "address": "Some Street 1",
    "city": "Berlin",
    "country": "DEU",
    "coordinates": { "latitude": "52.516667", "longitude": "13.383333" },
    "evse_uid": "EVSE-MISSING-001",
    "evse_id": "DE*CPO*E000000001",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [],
  "charging_periods": [
    {
      "start_date_time": "2025-01-01T00:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 5.0 } ]
    }
  ],
  "total_energy": 5.0,
  "total_time": 1.0,
  "last_updated": "2025-01-01T01:05:00Z"
}
EOF
)
body=$(do_post_cdr 200 "__MISSING_FIELD__" "$MISSING_FIELD_JSON")
assert_ocpi_error "$body" "CDR missing total_cost rejected"
 
# ===========================================================================
# CDR-12 POST CDR with multiple ChargingPeriods — assert all periods stored
# ===========================================================================
 
separator "CDR-12a. POST multi-period CDR"
body=$(do_post_cdr 200 "$CDR_MULTIPERIOD_ID" "$MULTIPERIOD_CDR_JSON")
assert_ocpi_success           "$body" "POST multi-period CDR"
assert_location_header_present "$CDR_MULTIPERIOD_ID"
 
separator "CDR-12b. GET multi-period CDR — assert all 3 ChargingPeriods preserved"
if [ -n "$(get_location_url "$CDR_MULTIPERIOD_ID")" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url "$CDR_MULTIPERIOD_ID")")
  assert_ocpi_success "$body" "GET multi-period CDR"
  assert_length "$body" "data.charging_periods" "3"
 
  # Period 1: before 17:00 — ENERGY + MAX_CURRENT
  assert_datetime  "$body" "data.charging_periods.0.start_date_time"       "2025-06-01T16:00:00Z"
  assert_field  "$body" "data.charging_periods.0.dimensions.0.type"     "ENERGY"
  assert_float  "$body" "data.charging_periods.0.dimensions.0.volume"   "4.3"
  assert_field  "$body" "data.charging_periods.0.dimensions.1.type"     "MAX_CURRENT"
  assert_float  "$body" "data.charging_periods.0.dimensions.1.volume"   "16.0"
  assert_field  "$body" "data.charging_periods.0.tariff_id"             "TARIFF-MULTI-01"
 
  # Period 2: after 17:00 — ENERGY
  assert_field  "$body" "data.charging_periods.1.start_date_time"       "2025-06-01T17:00:00Z"
  assert_field  "$body" "data.charging_periods.1.dimensions.0.type"     "ENERGY"
  assert_float  "$body" "data.charging_periods.1.dimensions.0.volume"   "1.1"
 
  # Period 3: parking
  assert_field  "$body" "data.charging_periods.2.start_date_time"       "2025-06-01T17:30:00Z"
  assert_field  "$body" "data.charging_periods.2.dimensions.0.type"     "PARKING_TIME"
  assert_float  "$body" "data.charging_periods.2.dimensions.0.volume"   "1.5"
 
  # Total energy = sum of both ENERGY periods
  assert_float "$body" "data.total_energy" "5.4"
  assert_float "$body" "data.total_parking_time" "1.5"
fi
 
# ===========================================================================
# CDR-13 POST CDR with signed_data — assert SignedData fields preserved
# ===========================================================================
 
separator "CDR-13a. POST CDR with signed_data (OCMF / Eichrecht)"
body=$(do_post_cdr 200 "$CDR_SIGNED_ID" "$SIGNED_CDR_JSON")
assert_ocpi_success           "$body" "POST signed CDR"
assert_location_header_present "$CDR_SIGNED_ID"
 
separator "CDR-13b. GET signed CDR — assert signed_data structure preserved"
if [ -n "$(get_location_url "$CDR_SIGNED_ID")" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url "$CDR_SIGNED_ID")")
  assert_ocpi_success "$body" "GET signed CDR"
 
  assert_field  "$body" "data.signed_data.encoding_method"           "OCMF"
  assert_field  "$body" "data.signed_data.encoding_method_version"   "1"
  assert_not_empty "$body" "data.signed_data.public_key"
  assert_field  "$body" "data.signed_data.url"  "https://example.com/verify/CDR-SIGNED-001"
 
  assert_length "$body" "data.signed_data.signed_values" "2"
  assert_field  "$body" "data.signed_data.signed_values.0.nature"     "Start"
  assert_not_empty "$body" "data.signed_data.signed_values.0.plain_data"
  assert_not_empty "$body" "data.signed_data.signed_values.0.signed_data"
  assert_field  "$body" "data.signed_data.signed_values.1.nature"     "End"
fi
 
# ===========================================================================
# CDR-14 POST home_charging_compensation CDR
# ===========================================================================
 
separator "CDR-14a. POST home charging compensation CDR"
body=$(do_post_cdr 200 "$CDR_HOME_ID" "$HOME_CDR_JSON")
assert_ocpi_success           "$body" "POST home CDR"
assert_location_header_present "$CDR_HOME_ID"
 
separator "CDR-14b. GET home CDR — assert home_charging_compensation flag"
if [ -n "$(get_location_url "$CDR_HOME_ID")" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url "$CDR_HOME_ID")")
  assert_ocpi_success "$body" "GET home CDR"
  assert_boolean "$body" "data.home_charging_compensation" "true"
  assert_field   "$body" "data.cdr_token.type"             "APP_USER"
  assert_float   "$body" "data.total_energy"               "40.0"
  assert_float   "$body" "data.total_time"                 "8.0"
 
  # session_id absent (home charger CDR may omit it)
  assert_null_or_missing "$body" "data.session_id"
fi
 
# ===========================================================================
# CDR-15 POST reservation-only CDR (no session, evse_uid=#NA)
# ===========================================================================
 
separator "CDR-15a. POST reservation-only CDR (no charging session)"
body=$(do_post_cdr 200 "$CDR_RESERVATION_ID" "$RESERVATION_CDR_JSON")
assert_ocpi_success           "$body" "POST reservation CDR"
assert_location_header_present "$CDR_RESERVATION_ID"
 
separator "CDR-15b. GET reservation CDR — assert #NA sentinel values"
if [ -n "$(get_location_url "$CDR_RESERVATION_ID")" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url "$CDR_RESERVATION_ID")")
  assert_ocpi_success "$body" "GET reservation CDR"
 
  assert_field  "$body" "data.cdr_location.evse_uid"     "#NA"
  assert_field  "$body" "data.cdr_location.evse_id"      "#NA"
  assert_field  "$body" "data.cdr_location.connector_id" "#NA"
  assert_null_or_missing "$body" "data.session_id"
  assert_field  "$body" "data.auth_method"               "COMMAND"
  assert_field  "$body" "data.authorization_reference"   "RESERVENOW-REF-001"
 
  assert_float  "$body" "data.total_reservation_cost.excl_vat" "1.00"
  assert_float  "$body" "data.total_reservation_cost.incl_vat" "1.21"
  assert_float  "$body" "data.total_energy"                    "0.0"
  assert_field  "$body" "data.remark"                          "Reservation expired without EV arriving"
 
  # Charging period uses RESERVATION_TIME dimension
  assert_length "$body" "data.charging_periods" "1"
  assert_field  "$body" "data.charging_periods.0.dimensions.0.type" "RESERVATION_TIME"
fi
 
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