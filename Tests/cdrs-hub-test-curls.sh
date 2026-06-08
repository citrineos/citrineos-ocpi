#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# CDRs module OCPI 2.2.1 - eMSP Receiver — Hub / Roaming Partner isolation tests
#
# Topology:
#   FR*CPO  ──┐
#             ├──► Hub ──► YOUR eMSP receiver  (this test)
#   DE*EVP  ──┘
#
# The hub forwards CDRs to your eMSP endpoint, preserving the originating
# CPO's country_code / party_id in the body.  Both CPOs may use the same
# OCPI CDR id.  Your eMSP must namespace by (country_code, party_id, id).
#
#   ISO-1   FR*CPO POSTs CDR id=SHARED-001 → 200 + Location
#   ISO-2   DE*EVP POSTs CDR id=SHARED-001 → 200 + Location (different namespace)
#   ISO-3   GET FR*CPO CDR via Location URL → FR payload, no DE bleed
#   ISO-4   GET DE*EVP CDR via Location URL → DE payload, no FR bleed
#   ISO-5   Full field validation — FR*CPO CDR
#   ISO-6   Full field validation — DE*EVP CDR
#   ISO-7   FR*CPO duplicate id → OCPI error
#   ISO-8   DE*EVP duplicate id → OCPI error
#   ISO-9   FR*CPO Credit CDR
#   ISO-10  DE*EVP Credit CDR (same credit id, isolated)
#   ISO-11  GET both Credit CDRs — assert credit fields per CPO
#   ISO-12  FR*CPO multi-period CDR — all periods stored
#   ISO-13  DE*EVP multi-period CDR same id — isolated, different periods
#   ISO-14  FR*CPO signed_data CDR
#   ISO-15  DE*EVP signed_data CDR same id — different verify URL
#   ISO-16  PUT returns 405 (CDRs immutable)
#   ISO-17  PATCH returns 405
#   ISO-18  DELETE returns 405
#   ISO-19  Missing required field (total_cost) → OCPI error, both CPOs
#
# Usage:
#   chmod +x cdrs-hub-roaming-test.sh
#   ./cdrs-hub-roaming-test.sh
#
# Environment overrides:
#   OCPI_BASE    base URL       (default: http://127.0.0.1:8085/ocpi)
#   OCPI_VERSION version string (default: 2.2.1)
#   AUTH_TOKEN   hub→eMSP token (default: see below)

OCPI_BASE="${OCPI_BASE:-http://127.0.0.1:8085/ocpi}"
OCPI_VERSION="${OCPI_VERSION:-2.2.1}"
CDR_ENDPOINT="$OCPI_BASE/emsp/$OCPI_VERSION/cdrs"

# Single token — the hub authenticates to your eMSP with one credential

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

# ---------------------------------------------------------------------------
# Colours
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m';  BOLD='\033[1m';   DIM='\033[2m'; RESET='\033[0m'

PASS=0; FAIL=0

CDR_URL_DIR=$(mktemp -d)
trap 'rm -rf "$CDR_URL_DIR"' EXIT

get_location_url() { local f="$CDR_URL_DIR/$1"; [ -f "$f" ] && cat "$f" || echo ""; }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

separator() {
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}  $1${RESET}"
  echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
}

do_post_cdr() {
  local expected_http="$1" label="$2" json_body="$3"
  local tmp_body tmp_headers http_code location body

  tmp_body=$(mktemp); tmp_headers=$(mktemp)

  http_code=$(curl -sS -w "%{http_code}" -D "$tmp_headers" -o "$tmp_body" \
    -X POST "$CDR_ENDPOINT" "${OCPI_HEADERS[@]}" \
    -H "X-Request-ID: $(uuidgen 2>/dev/null || echo req-$label)" \
    -H "X-Correlation-ID: $(uuidgen 2>/dev/null || echo corr-$label)" \
    -d "$json_body" 2>&1) || {
      echo -e "${RED}  Connection error — is the server running?${RESET}" >&2
      FAIL=$((FAIL+1)); rm -f "$tmp_body" "$tmp_headers"; echo ""; return
    }

  if [ "$http_code" = "$expected_http" ]; then
    echo -e "  ${GREEN}HTTP $http_code${RESET}  ${DIM}(expected $expected_http)${RESET}" >&2
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}HTTP $http_code${RESET}  ${YELLOW}(expected $expected_http)${RESET}" >&2
    FAIL=$((FAIL+1))
  fi

  location=$(grep -i "^location:" "$tmp_headers" | head -1 | tr -d '\r' | sed 's/^[Ll]ocation: *//')
  if [ -n "$location" ]; then
    echo "$location" > "$CDR_URL_DIR/$label"
    echo -e "  ${DIM}Location: $location${RESET}" >&2
  fi

  body=$(cat "$tmp_body"); rm -f "$tmp_body" "$tmp_headers"; echo "$body"
}

do_curl_method() {
  local method="$1" expected_http="$2" url="$3"; shift 3
  local tmp http_code body

  tmp=$(mktemp)
  http_code=$(curl -sS -w "%{http_code}" -o "$tmp" -X "$method" "$url" \
    "${OCPI_HEADERS[@]}" \
    -H "X-Request-ID: $(uuidgen 2>/dev/null || echo req-$method)" \
    -H "X-Correlation-ID: $(uuidgen 2>/dev/null || echo corr-$method)" \
    "$@" 2>&1) || {
      echo -e "${RED}  Connection error${RESET}" >&2
      FAIL=$((FAIL+1)); rm -f "$tmp"; echo ""; return
    }

  if [ "$http_code" = "$expected_http" ]; then
    echo -e "  ${GREEN}HTTP $http_code${RESET}  ${DIM}(expected $expected_http)${RESET}" >&2
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}HTTP $http_code${RESET}  ${YELLOW}(expected $expected_http)${RESET}" >&2
    FAIL=$((FAIL+1))
  fi

  body=$(cat "$tmp"); rm -f "$tmp"; echo "$body"
}

assert_field() {
  local body="$1" path="$2" expected="$3"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys,json
data=json.load(sys.stdin)
keys='$path'.split('.')
val=data
try:
    for k in keys: val=val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print(val if not isinstance(val,bool) else str(val).lower())
except: print('__MISSING__')
" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} = ${GREEN}$actual${RESET}"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected ${GREEN}$expected${RESET}, got ${RED}$actual${RESET}"; FAIL=$((FAIL+1))
  fi
}

assert_float() {
  local body="$1" path="$2" expected="$3"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys,json
data=json.load(sys.stdin)
keys='$path'.split('.')
val=data
try:
    for k in keys: val=val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print('$expected' if abs(float(val)-float('$expected'))<1e-9 else float(val))
except: print('__MISSING__')
" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} ≈ ${GREEN}$expected${RESET}"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected ${GREEN}$expected${RESET}, got ${RED}$actual${RESET}"; FAIL=$((FAIL+1))
  fi
}

assert_length() {
  local body="$1" path="$2" expected="$3"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys,json
data=json.load(sys.stdin)
keys='$path'.split('.')
val=data
try:
    for k in keys: val=val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print(len(val))
except: print(-1)
" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} has length ${GREEN}$actual${RESET}"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected length ${GREEN}$expected${RESET}, got ${RED}$actual${RESET}"; FAIL=$((FAIL+1))
  fi
}

assert_null_or_missing() {
  local body="$1" path="$2"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys,json
data=json.load(sys.stdin)
keys='$path'.split('.')
val=data
try:
    for k in keys: val=val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print('null' if val is None else str(val))
except: print('__MISSING__')
" 2>/dev/null)
  if [ "$actual" = "__MISSING__" ] || [ "$actual" = "null" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} is null/missing"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected null/missing, got ${RED}$actual${RESET}"; FAIL=$((FAIL+1))
  fi
}

assert_not_empty() {
  local body="$1" path="$2"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys,json
data=json.load(sys.stdin)
keys='$path'.split('.')
val=data
try:
    for k in keys: val=val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print('__EMPTY__' if val is None or val=='' else 'ok')
except: print('__MISSING__')
" 2>/dev/null)
  if [ "$actual" = "ok" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} is present and non-empty"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected non-empty, got ${RED}$actual${RESET}"; FAIL=$((FAIL+1))
  fi
}

assert_boolean() {
  local body="$1" path="$2" expected="$3"
  local actual
  actual=$(echo "$body" | python3 -c "
import sys,json
data=json.load(sys.stdin)
keys='$path'.split('.')
val=data
try:
    for k in keys: val=val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print(str(val).lower())
except: print('__MISSING__')
" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} = ${GREEN}$actual${RESET}"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected ${GREEN}$expected${RESET}, got ${RED}$actual${RESET}"; FAIL=$((FAIL+1))
  fi
}

assert_datetime() {
  local body="$1" path="$2" expected="$3"
  local actual expected_ts actual_ts
  actual=$(echo "$body" | python3 -c "
import sys,json
data=json.load(sys.stdin)
keys='$path'.split('.')
val=data
try:
    for k in keys: val=val[int(k)] if k.lstrip('-').isdigit() else val[k]
    print(val)
except: print('__MISSING__')
" 2>/dev/null)
  expected_ts=$(date -d "$expected" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$expected" +%s 2>/dev/null)
  actual_ts=$(date -d "$actual" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S%z" "$actual" +%s 2>/dev/null)
  if [ "$expected_ts" = "$actual_ts" ]; then
    echo -e "    ${GREEN}✓${RESET} ${DIM}$path${RESET} = ${GREEN}$actual${RESET}"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} ${DIM}$path${RESET}: expected ${GREEN}$expected${RESET}, got ${RED}$actual${RESET}"; FAIL=$((FAIL+1))
  fi
}

assert_location_header_present() {
  local label="$1" url
  url=$(get_location_url "$label")
  if [ -n "$url" ]; then
    echo -e "    ${GREEN}✓${RESET} Location header present: ${DIM}$url${RESET}"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} Location header missing for '$label'"; FAIL=$((FAIL+1))
  fi
}

assert_ocpi_success() {
  local body="$1" label="$2"
  local code
  code=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status_code',''))" 2>/dev/null)
  if [ "$code" = "1000" ]; then
    echo -e "    ${GREEN}✓${RESET} $label — OCPI status_code 1000"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} $label — expected 1000, got $code"; FAIL=$((FAIL+1))
  fi
}

assert_ocpi_error() {
  local body="$1" label="$2"
  local code
  code=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status_code',''))" 2>/dev/null)
  if [ "$code" != "1000" ] && [ -n "$code" ]; then
    echo -e "    ${GREEN}✓${RESET} $label — OCPI error $code (expected)"; PASS=$((PASS+1))
  else
    echo -e "    ${RED}✗${RESET} $label — expected OCPI error, got '$code'"; FAIL=$((FAIL+1))
  fi
}

# ===========================================================================
# Fixtures
# The hub forwards CDRs preserving the originating CPO's country_code/party_id.
# Both CPOs use id=CDR-SHARED-001 — your eMSP must store them separately.
# ===========================================================================

# ---- FR*CPO CDRs -----------------------------------------------------------

FR_CPO_MINIMAL=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "CPO",
  "id": "CDR-SHARED-001",
  "start_date_time": "2025-03-10T08:00:00Z",
  "end_date_time":   "2025-03-10T09:00:00Z",
  "session_id": "SESSION-FR-001",
  "cdr_token": {
    "country_code": "FR",
    "party_id": "MSP",
    "uid": "RFID-FR-001",
    "type": "RFID",
    "contract_id": "FR-MSP-CONTRACT-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-FR-CPO-001",
    "address": "1 Rue de Rivoli",
    "city": "Paris",
    "country": "FRA",
    "coordinates": { "latitude": "48.860611", "longitude": "2.337644" },
    "evse_uid": "EVSE-FR-001",
    "evse_id": "FR*CPO*E001",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "CPO",
      "id": "TARIFF-FR-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.28, "vat": 20.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-03-10T08:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 15.0 } ],
      "tariff_id": "TARIFF-FR-01"
    }
  ],
  "total_cost":   { "excl_vat": 4.20, "incl_vat": 5.04 },
  "total_energy": 15.0,
  "total_time":   1.0,
  "last_updated": "2025-03-10T09:05:00Z"
}
EOF
)

FR_CPO_CREDIT=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "CPO",
  "id": "CDR-SHARED-001-C",
  "start_date_time": "2025-03-10T08:00:00Z",
  "end_date_time":   "2025-03-10T09:00:00Z",
  "session_id": "SESSION-FR-001",
  "cdr_token": {
    "country_code": "FR",
    "party_id": "MSP",
    "uid": "RFID-FR-001",
    "type": "RFID",
    "contract_id": "FR-MSP-CONTRACT-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-FR-CPO-001",
    "address": "1 Rue de Rivoli",
    "city": "Paris",
    "country": "FRA",
    "coordinates": { "latitude": "48.860611", "longitude": "2.337644" },
    "evse_uid": "EVSE-FR-001",
    "evse_id": "FR*CPO*E001",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "CPO",
      "id": "TARIFF-FR-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.28, "vat": 20.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-03-10T08:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 15.0 } ],
      "tariff_id": "TARIFF-FR-01"
    }
  ],
  "total_cost":          { "excl_vat": -4.20, "incl_vat": -5.04 },
  "total_energy":        15.0,
  "total_time":          1.0,
  "credit":              true,
  "credit_reference_id": "CDR-SHARED-001",
  "last_updated": "2025-03-15T10:00:00Z"
}
EOF
)

FR_CPO_MULTI=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "CPO",
  "id": "CDR-SHARED-MULTI-001",
  "start_date_time": "2025-06-01T16:00:00Z",
  "end_date_time":   "2025-06-01T19:00:00Z",
  "session_id": "SESSION-FR-MULTI-001",
  "cdr_token": {
    "country_code": "FR",
    "party_id": "MSP",
    "uid": "RFID-FR-MULTI-001",
    "type": "RFID",
    "contract_id": "FR-MSP-MULTI-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-FR-MULTI",
    "address": "5 Avenue Kléber",
    "city": "Paris",
    "country": "FRA",
    "coordinates": { "latitude": "48.874000", "longitude": "2.294000" },
    "evse_uid": "EVSE-FR-MULTI-001",
    "evse_id": "FR*CPO*E002",
    "connector_id": "2",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "CPO",
      "id": "TARIFF-FR-MULTI-01",
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
      "tariff_id": "TARIFF-FR-MULTI-01"
    },
    {
      "start_date_time": "2025-06-01T17:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 1.1 } ],
      "tariff_id": "TARIFF-FR-MULTI-01"
    },
    {
      "start_date_time": "2025-06-01T17:30:00Z",
      "dimensions": [ { "type": "PARKING_TIME", "volume": 1.5 } ],
      "tariff_id": "TARIFF-FR-MULTI-01"
    }
  ],
  "total_cost":         { "excl_vat": 1.157, "incl_vat": 1.388 },
  "total_energy":       5.4,
  "total_time":         3.0,
  "total_parking_time": 1.5,
  "last_updated": "2025-06-01T19:05:00Z"
}
EOF
)

FR_CPO_SIGNED=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "CPO",
  "id": "CDR-SHARED-SIGNED-001",
  "start_date_time": "2025-07-01T09:00:00Z",
  "end_date_time":   "2025-07-01T10:00:00Z",
  "session_id": "SESSION-FR-SIGNED-001",
  "cdr_token": {
    "country_code": "FR",
    "party_id": "MSP",
    "uid": "RFID-FR-SIGNED-001",
    "type": "RFID",
    "contract_id": "FR-MSP-SIGNED-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-FR-SIGNED",
    "address": "Tour Eiffel",
    "city": "Paris",
    "country": "FRA",
    "coordinates": { "latitude": "48.858370", "longitude": "2.294481" },
    "evse_uid": "EVSE-FR-SIGNED-001",
    "evse_id": "FR*CPO*E003",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2_COMBO",
    "connector_format": "CABLE",
    "connector_power_type": "DC"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "FR",
      "party_id": "CPO",
      "id": "TARIFF-FR-SIGNED-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.35, "vat": 20.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-07-01T09:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 30.0 } ],
      "tariff_id": "TARIFF-FR-SIGNED-01"
    }
  ],
  "signed_data": {
    "encoding_method": "OCMF",
    "encoding_method_version": 1,
    "public_key": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEfakePublicKeyFR==",
    "signed_values": [
      {
        "nature": "Start",
        "plain_data": "START|2025-07-01T09:00:00Z|0.000kWh",
        "signed_data": "c2lnbmVkX3N0YXJ0X0ZSX2Zha2VfYmFzZTY0"
      },
      {
        "nature": "End",
        "plain_data": "END|2025-07-01T10:00:00Z|30.000kWh",
        "signed_data": "c2lnbmVkX2VuZF9GUl9mYWtlX2Jhc2U2NA=="
      }
    ],
    "url": "https://verify.example.com/FR-CPO/CDR-SHARED-SIGNED-001"
  },
  "total_cost":   { "excl_vat": 10.50, "incl_vat": 12.60 },
  "total_energy": 30.0,
  "total_time":   1.0,
  "last_updated": "2025-07-01T10:05:00Z"
}
EOF
)

# ---- DE*EVP CDRs — same ids, distinct payloads -----------------------------

DE_EVP_MINIMAL=$(cat <<'EOF'
{
  "country_code": "DE",
  "party_id": "EVP",
  "id": "CDR-SHARED-001",
  "start_date_time": "2025-03-10T10:00:00Z",
  "end_date_time":   "2025-03-10T11:30:00Z",
  "session_id": "SESSION-DE-001",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "MSP",
    "uid": "RFID-DE-001",
    "type": "RFID",
    "contract_id": "DE-MSP-CONTRACT-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-DE-CPO-001",
    "address": "Unter den Linden 77",
    "city": "Berlin",
    "country": "DEU",
    "coordinates": { "latitude": "52.516500", "longitude": "13.388000" },
    "evse_uid": "EVSE-DE-001",
    "evse_id": "DE*EVP*E001",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "DE",
      "party_id": "CPO",
      "id": "TARIFF-DE-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.32, "vat": 19.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-03-10T10:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 22.0 } ],
      "tariff_id": "TARIFF-DE-01"
    }
  ],
  "total_cost":   { "excl_vat": 7.04, "incl_vat": 8.378 },
  "total_energy": 22.0,
  "total_time":   1.5,
  "last_updated": "2025-03-10T11:35:00Z"
}
EOF
)

DE_EVP_CREDIT=$(cat <<'EOF'
{
  "country_code": "DE",
  "party_id": "EVP",
  "id": "CDR-SHARED-001-C",
  "start_date_time": "2025-03-10T10:00:00Z",
  "end_date_time":   "2025-03-10T11:30:00Z",
  "session_id": "SESSION-DE-001",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "MSP",
    "uid": "RFID-DE-001",
    "type": "RFID",
    "contract_id": "DE-MSP-CONTRACT-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-DE-CPO-001",
    "address": "Unter den Linden 77",
    "city": "Berlin",
    "country": "DEU",
    "coordinates": { "latitude": "52.516500", "longitude": "13.388000" },
    "evse_uid": "EVSE-DE-001",
    "evse_id": "DE*EVP*E001",
    "connector_id": "1",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "DE",
      "party_id": "CPO",
      "id": "TARIFF-DE-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.32, "vat": 19.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-03-10T10:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 22.0 } ],
      "tariff_id": "TARIFF-DE-01"
    }
  ],
  "total_cost":          { "excl_vat": -7.04, "incl_vat": -8.378 },
  "total_energy":        22.0,
  "total_time":          1.5,
  "credit":              true,
  "credit_reference_id": "CDR-SHARED-001",
  "last_updated": "2025-03-16T10:00:00Z"
}
EOF
)

DE_EVP_MULTI=$(cat <<'EOF'
{
  "country_code": "DE",
  "party_id": "EVP",
  "id": "CDR-SHARED-MULTI-001",
  "start_date_time": "2025-06-02T08:00:00Z",
  "end_date_time":   "2025-06-02T11:00:00Z",
  "session_id": "SESSION-DE-MULTI-001",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "MSP",
    "uid": "RFID-DE-MULTI-001",
    "type": "RFID",
    "contract_id": "DE-MSP-MULTI-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-DE-MULTI",
    "address": "Alexanderplatz 1",
    "city": "Berlin",
    "country": "DEU",
    "coordinates": { "latitude": "52.521918", "longitude": "13.413215" },
    "evse_uid": "EVSE-DE-MULTI-001",
    "evse_id": "DE*EVP*E002",
    "connector_id": "3",
    "connector_standard": "IEC_62196_T2",
    "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR",
  "tariffs": [
    {
      "country_code": "DE",
      "party_id": "CPO",
      "id": "TARIFF-DE-MULTI-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.25, "vat": 19.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-06-02T08:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 10.0 }, { "type": "MAX_CURRENT", "volume": 32.0 } ],
      "tariff_id": "TARIFF-DE-MULTI-01"
    },
    {
      "start_date_time": "2025-06-02T09:30:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 5.5 } ],
      "tariff_id": "TARIFF-DE-MULTI-01"
    },
    {
      "start_date_time": "2025-06-02T10:15:00Z",
      "dimensions": [ { "type": "PARKING_TIME", "volume": 0.75 } ],
      "tariff_id": "TARIFF-DE-MULTI-01"
    }
  ],
  "total_cost":         { "excl_vat": 3.875, "incl_vat": 4.611 },
  "total_energy":       15.5,
  "total_time":         3.0,
  "total_parking_time": 0.75,
  "last_updated": "2025-06-02T11:05:00Z"
}
EOF
)

DE_EVP_SIGNED=$(cat <<'EOF'
{
  "country_code": "DE",
  "party_id": "EVP",
  "id": "CDR-SHARED-SIGNED-001",
  "start_date_time": "2025-07-02T11:00:00Z",
  "end_date_time":   "2025-07-02T12:00:00Z",
  "session_id": "SESSION-DE-SIGNED-001",
  "cdr_token": {
    "country_code": "DE",
    "party_id": "MSP",
    "uid": "RFID-DE-SIGNED-001",
    "type": "RFID",
    "contract_id": "DE-MSP-SIGNED-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-DE-SIGNED",
    "address": "Potsdamer Platz 1",
    "city": "Berlin",
    "country": "DEU",
    "coordinates": { "latitude": "52.509669", "longitude": "13.376294" },
    "evse_uid": "EVSE-DE-SIGNED-001",
    "evse_id": "DE*EVP*E003",
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
      "id": "TARIFF-DE-SIGNED-01",
      "currency": "EUR",
      "elements": [
        { "price_components": [ { "type": "ENERGY", "price": 0.40, "vat": 19.0, "step_size": 1 } ] }
      ],
      "last_updated": "2025-01-01T00:00:00Z"
    }
  ],
  "charging_periods": [
    {
      "start_date_time": "2025-07-02T11:00:00Z",
      "dimensions": [ { "type": "ENERGY", "volume": 25.0 } ],
      "tariff_id": "TARIFF-DE-SIGNED-01"
    }
  ],
  "signed_data": {
    "encoding_method": "OCMF",
    "encoding_method_version": 1,
    "public_key": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEfakePublicKeyDE==",
    "signed_values": [
      {
        "nature": "Start",
        "plain_data": "START|2025-07-02T11:00:00Z|0.000kWh",
        "signed_data": "c2lnbmVkX3N0YXJ0X0RFX2Zha2VfYmFzZTY0"
      },
      {
        "nature": "End",
        "plain_data": "END|2025-07-02T12:00:00Z|25.000kWh",
        "signed_data": "c2lnbmVkX2VuZF9ERV9mYWtlX2Jhc2U2NA=="
      }
    ],
    "url": "https://verify.example.com/DE-CPO/CDR-SHARED-SIGNED-001"
  },
  "total_cost":   { "excl_vat": 10.00, "incl_vat": 11.90 },
  "total_energy": 25.0,
  "total_time":   1.0,
  "last_updated": "2025-07-02T12:05:00Z"
}
EOF
)

# ===========================================================================
# ISO-1  FR*CPO POSTs CDR id=CDR-SHARED-001
# ===========================================================================

separator "ISO-1. FR*CPO POST CDR id=CDR-SHARED-001 — expect 200 + Location"
body=$(do_post_cdr 200 "FR_CDR_SHARED_001" "$FR_CPO_MINIMAL")
assert_ocpi_success            "$body" "FR*CPO POST"
assert_location_header_present "FR_CDR_SHARED_001"

# ===========================================================================
# ISO-2  DE*EVP POSTs CDR with the same id — must succeed (different namespace)
# ===========================================================================

separator "ISO-2. DE*EVP POST CDR same id=CDR-SHARED-001 — must succeed (different namespace)"
body=$(do_post_cdr 200 "DE_CDR_SHARED_001" "$DE_EVP_MINIMAL")
assert_ocpi_success            "$body" "DE*EVP POST same id"
assert_location_header_present "DE_CDR_SHARED_001"

# ===========================================================================
# ISO-3  GET FR*CPO CDR — must return FR payload only
# ===========================================================================

separator "ISO-3. GET FR*CPO CDR via Location URL — FR payload, no DE bleed"
if [ -n "$(get_location_url FR_CDR_SHARED_001)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url FR_CDR_SHARED_001)")
  assert_ocpi_success "$body" "GET FR*CPO CDR"
  assert_field "$body" "data.country_code"           "FR"
  assert_field "$body" "data.party_id"               "CPO"
  assert_field "$body" "data.id"                     "CDR-SHARED-001"
  assert_field "$body" "data.session_id"             "SESSION-FR-001"
  assert_field "$body" "data.cdr_location.id"        "LOC-FR-CPO-001"
  assert_field "$body" "data.cdr_location.country"   "FRA"
  assert_field "$body" "data.cdr_location.evse_id"   "FR*CPO*E001"
else
  echo -e "  ${YELLOW}SKIP — no Location URL for FR*CPO${RESET}"
fi

# ===========================================================================
# ISO-4  GET DE*EVP CDR — must return DE payload only
# ===========================================================================

separator "ISO-4. GET DE*EVP CDR via Location URL — DE payload, no FR bleed"
if [ -n "$(get_location_url DE_CDR_SHARED_001)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url DE_CDR_SHARED_001)")
  assert_ocpi_success "$body" "GET DE*EVP CDR"
  assert_field "$body" "data.country_code"           "DE"
  assert_field "$body" "data.party_id"               "CPO"
  assert_field "$body" "data.id"                     "CDR-SHARED-001"
  assert_field "$body" "data.session_id"             "SESSION-DE-001"
  assert_field "$body" "data.cdr_location.id"        "LOC-DE-CPO-001"
  assert_field "$body" "data.cdr_location.country"   "DEU"
  assert_field "$body" "data.cdr_location.evse_id"   "DE*EVP*E001"
else
  echo -e "  ${YELLOW}SKIP — no Location URL for DE*EVP${RESET}"
fi

# ===========================================================================
# ISO-5  Full field validation — FR*CPO CDR
# ===========================================================================

separator "ISO-5. Full field validation — FR*CPO CDR"
if [ -n "$(get_location_url FR_CDR_SHARED_001)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url FR_CDR_SHARED_001)")

  assert_datetime "$body" "data.start_date_time" "2025-03-10T08:00:00Z"
  assert_datetime "$body" "data.end_date_time"   "2025-03-10T09:00:00Z"
  assert_field    "$body" "data.auth_method"     "WHITELIST"
  assert_field    "$body" "data.currency"        "EUR"

  assert_field "$body" "data.cdr_token.country_code" "FR"
  assert_field "$body" "data.cdr_token.party_id"     "MSP"
  assert_field "$body" "data.cdr_token.uid"          "RFID-FR-001"
  assert_field "$body" "data.cdr_token.type"         "RFID"
  assert_field "$body" "data.cdr_token.contract_id"  "FR-MSP-CONTRACT-001"

  assert_field "$body" "data.cdr_location.address"              "1 Rue de Rivoli"
  assert_field "$body" "data.cdr_location.city"                 "Paris"
  assert_field "$body" "data.cdr_location.connector_standard"   "IEC_62196_T2"
  assert_field "$body" "data.cdr_location.connector_power_type" "AC_3_PHASE"

  assert_length "$body" "data.tariffs"          "1"
  assert_field  "$body" "data.tariffs.0.id"     "TARIFF-FR-01"
  assert_float  "$body" "data.tariffs.0.elements.0.price_components.0.price" "0.28"

  assert_length "$body" "data.charging_periods" "1"
  assert_field  "$body" "data.charging_periods.0.dimensions.0.type"   "ENERGY"
  assert_float  "$body" "data.charging_periods.0.dimensions.0.volume" "15.0"

  assert_float "$body" "data.total_energy"        "15.0"
  assert_float "$body" "data.total_time"           "1.0"
  assert_float "$body" "data.total_cost.excl_vat"  "4.20"
  assert_float "$body" "data.total_cost.incl_vat"  "5.04"

  assert_null_or_missing "$body" "data.credit"
  assert_not_empty       "$body" "data.last_updated"
fi

# ===========================================================================
# ISO-6  Full field validation — DE*EVP CDR
# ===========================================================================

separator "ISO-6. Full field validation — DE*EVP CDR"
if [ -n "$(get_location_url DE_CDR_SHARED_001)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url DE_CDR_SHARED_001)")

  assert_datetime "$body" "data.start_date_time" "2025-03-10T10:00:00Z"
  assert_datetime "$body" "data.end_date_time"   "2025-03-10T11:30:00Z"
  assert_field    "$body" "data.auth_method"     "WHITELIST"
  assert_field    "$body" "data.currency"        "EUR"

  assert_field "$body" "data.cdr_token.country_code" "DE"
  assert_field "$body" "data.cdr_token.party_id"     "MSP"
  assert_field "$body" "data.cdr_token.uid"          "RFID-DE-001"
  assert_field "$body" "data.cdr_token.contract_id"  "DE-MSP-CONTRACT-001"

  assert_field "$body" "data.cdr_location.address"            "Unter den Linden 77"
  assert_field "$body" "data.cdr_location.city"               "Berlin"
  assert_field "$body" "data.cdr_location.connector_standard" "IEC_62196_T2"

  assert_length "$body" "data.tariffs"          "1"
  assert_field  "$body" "data.tariffs.0.id"     "TARIFF-DE-01"
  assert_float  "$body" "data.tariffs.0.elements.0.price_components.0.price" "0.32"

  assert_length "$body" "data.charging_periods" "1"
  assert_float  "$body" "data.charging_periods.0.dimensions.0.volume" "22.0"

  assert_float "$body" "data.total_energy"        "22.0"
  assert_float "$body" "data.total_time"           "1.5"
  assert_float "$body" "data.total_cost.excl_vat"  "7.04"
  assert_float "$body" "data.total_cost.incl_vat"  "8.378"

  assert_null_or_missing "$body" "data.credit"
  assert_not_empty       "$body" "data.last_updated"
fi

# ===========================================================================
# ISO-7  FR*CPO duplicate id → OCPI error
# ===========================================================================

separator "ISO-7. FR*CPO POST duplicate id — must return OCPI error"
body=$(do_post_cdr 200 "__FR_DUP__" "$FR_CPO_MINIMAL")
assert_ocpi_error "$body" "FR*CPO duplicate CDR rejected"

# ===========================================================================
# ISO-8  DE*EVP duplicate id → OCPI error
# ===========================================================================

separator "ISO-8. DE*EVP POST duplicate id — must return OCPI error"
body=$(do_post_cdr 200 "__DE_DUP__" "$DE_EVP_MINIMAL")
assert_ocpi_error "$body" "DE*EVP duplicate CDR rejected"

# ===========================================================================
# ISO-9  FR*CPO Credit CDR
# ===========================================================================

separator "ISO-9. FR*CPO POST Credit CDR"
body=$(do_post_cdr 200 "FR_CDR_CREDIT" "$FR_CPO_CREDIT")
assert_ocpi_success            "$body" "FR*CPO POST credit CDR"
assert_location_header_present "FR_CDR_CREDIT"

# ===========================================================================
# ISO-10 DE*EVP Credit CDR (same credit id, isolated namespace)
# ===========================================================================

separator "ISO-10. DE*EVP POST Credit CDR (same id, isolated)"
body=$(do_post_cdr 200 "DE_CDR_CREDIT" "$DE_EVP_CREDIT")
assert_ocpi_success            "$body" "DE*EVP POST credit CDR"
assert_location_header_present "DE_CDR_CREDIT"

# ===========================================================================
# ISO-11 GET both Credit CDRs — assert credit fields per CPO
# ===========================================================================

separator "ISO-11a. GET FR*CPO Credit CDR — assert credit fields"
if [ -n "$(get_location_url FR_CDR_CREDIT)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url FR_CDR_CREDIT)")
  assert_ocpi_success  "$body" "GET FR*CPO credit CDR"
  assert_field         "$body" "data.country_code"        "FR"
  assert_field         "$body" "data.party_id"            "CPO"
  assert_boolean       "$body" "data.credit"              "true"
  assert_field         "$body" "data.credit_reference_id" "CDR-SHARED-001"
  assert_float         "$body" "data.total_cost.excl_vat" "-4.20"
  assert_float         "$body" "data.total_cost.incl_vat" "-5.04"
else
  echo -e "  ${YELLOW}SKIP — no Location URL${RESET}"
fi

separator "ISO-11b. GET DE*EVP Credit CDR — assert credit fields"
if [ -n "$(get_location_url DE_CDR_CREDIT)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url DE_CDR_CREDIT)")
  assert_ocpi_success  "$body" "GET DE*EVP credit CDR"
  assert_field         "$body" "data.country_code"        "DE"
  assert_field         "$body" "data.party_id"            "CPO"
  assert_boolean       "$body" "data.credit"              "true"
  assert_field         "$body" "data.credit_reference_id" "CDR-SHARED-001"
  assert_float         "$body" "data.total_cost.excl_vat" "-7.04"
  assert_float         "$body" "data.total_cost.incl_vat" "-8.378"
else
  echo -e "  ${YELLOW}SKIP — no Location URL${RESET}"
fi

# ===========================================================================
# ISO-12 FR*CPO multi-period CDR
# ===========================================================================

separator "ISO-12a. FR*CPO POST multi-period CDR"
body=$(do_post_cdr 200 "FR_CDR_MULTI" "$FR_CPO_MULTI")
assert_ocpi_success            "$body" "FR*CPO POST multi-period"
assert_location_header_present "FR_CDR_MULTI"

separator "ISO-12b. GET FR*CPO multi-period CDR — all 3 periods stored"
if [ -n "$(get_location_url FR_CDR_MULTI)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url FR_CDR_MULTI)")
  assert_ocpi_success "$body" "GET FR*CPO multi-period"
  assert_field  "$body" "data.country_code" "FR"
  assert_length "$body" "data.charging_periods" "3"
  assert_field  "$body" "data.charging_periods.0.dimensions.0.type"   "ENERGY"
  assert_float  "$body" "data.charging_periods.0.dimensions.0.volume" "4.3"
  assert_field  "$body" "data.charging_periods.0.dimensions.1.type"   "MAX_CURRENT"
  assert_float  "$body" "data.charging_periods.1.dimensions.0.volume" "1.1"
  assert_field  "$body" "data.charging_periods.2.dimensions.0.type"   "PARKING_TIME"
  assert_float  "$body" "data.total_energy"       "5.4"
  assert_float  "$body" "data.total_parking_time" "1.5"
fi

# ===========================================================================
# ISO-13 DE*EVP multi-period CDR — same id, different periods
# ===========================================================================

separator "ISO-13a. DE*EVP POST multi-period CDR (same id, isolated)"
body=$(do_post_cdr 200 "DE_CDR_MULTI" "$DE_EVP_MULTI")
assert_ocpi_success            "$body" "DE*EVP POST multi-period"
assert_location_header_present "DE_CDR_MULTI"

separator "ISO-13b. GET DE*EVP multi-period CDR — correct periods, no FR bleed"
if [ -n "$(get_location_url DE_CDR_MULTI)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url DE_CDR_MULTI)")
  assert_ocpi_success "$body" "GET DE*EVP multi-period"
  assert_field  "$body" "data.country_code" "DE"
  assert_length "$body" "data.charging_periods" "3"
  assert_float  "$body" "data.charging_periods.0.dimensions.0.volume" "10.0"
  assert_field  "$body" "data.charging_periods.0.dimensions.1.type"   "MAX_CURRENT"
  assert_float  "$body" "data.charging_periods.1.dimensions.0.volume" "5.5"
  assert_field  "$body" "data.charging_periods.2.dimensions.0.type"   "PARKING_TIME"
  assert_float  "$body" "data.total_energy"       "15.5"
  assert_float  "$body" "data.total_parking_time" "0.75"
fi

# ===========================================================================
# ISO-14 FR*CPO signed_data CDR
# ===========================================================================

separator "ISO-14a. FR*CPO POST CDR with signed_data"
body=$(do_post_cdr 200 "FR_CDR_SIGNED" "$FR_CPO_SIGNED")
assert_ocpi_success            "$body" "FR*CPO POST signed CDR"
assert_location_header_present "FR_CDR_SIGNED"

separator "ISO-14b. GET FR*CPO signed CDR — signed_data preserved"
if [ -n "$(get_location_url FR_CDR_SIGNED)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url FR_CDR_SIGNED)")
  assert_ocpi_success  "$body" "GET FR*CPO signed CDR"
  assert_field         "$body" "data.signed_data.encoding_method"         "OCMF"
  assert_field         "$body" "data.signed_data.encoding_method_version" "1"
  assert_not_empty     "$body" "data.signed_data.public_key"
  assert_field         "$body" "data.signed_data.url" "https://verify.example.com/FR-CPO/CDR-SHARED-SIGNED-001"
  assert_length        "$body" "data.signed_data.signed_values" "2"
  assert_field         "$body" "data.signed_data.signed_values.0.nature" "Start"
  assert_field         "$body" "data.signed_data.signed_values.1.nature" "End"
fi

# ===========================================================================
# ISO-15 DE*EVP signed_data CDR — same id, different verify URL
# ===========================================================================

separator "ISO-15a. DE*EVP POST CDR with signed_data (same id, isolated)"
body=$(do_post_cdr 200 "DE_CDR_SIGNED" "$DE_EVP_SIGNED")
assert_ocpi_success            "$body" "DE*EVP POST signed CDR"
assert_location_header_present "DE_CDR_SIGNED"

separator "ISO-15b. GET DE*EVP signed CDR — DE verify URL, not FR URL"
if [ -n "$(get_location_url DE_CDR_SIGNED)" ]; then
  body=$(do_curl_method GET 200 "$(get_location_url DE_CDR_SIGNED)")
  assert_ocpi_success  "$body" "GET DE*EVP signed CDR"
  assert_field         "$body" "data.signed_data.encoding_method" "OCMF"
  assert_not_empty     "$body" "data.signed_data.public_key"
  assert_field         "$body" "data.signed_data.url" "https://verify.example.com/DE-CPO/CDR-SHARED-SIGNED-001"
  assert_length        "$body" "data.signed_data.signed_values" "2"
fi

# ===========================================================================
# ISO-16 PUT → 405
# ===========================================================================

separator "ISO-16. PUT on CDR endpoint — must return 405 (CDRs immutable)"
fr_url=$(get_location_url FR_CDR_SHARED_001)
fr_url="${fr_url:-$CDR_ENDPOINT/CDR-SHARED-001}"
do_curl_method PUT 405 "$fr_url" -d "$FR_CPO_MINIMAL" > /dev/null

# ===========================================================================
# ISO-17 PATCH → 405
# ===========================================================================

separator "ISO-17. PATCH on CDR endpoint — must return 405"
do_curl_method PATCH 405 "$fr_url" -d '{"remark":"patch attempt"}' > /dev/null

# ===========================================================================
# ISO-18 DELETE → 405
# ===========================================================================

separator "ISO-18. DELETE on CDR endpoint — must return 405"
do_curl_method DELETE 405 "$fr_url" > /dev/null

# ===========================================================================
# ISO-19 Missing required field (total_cost) — both CPOs must reject
# ===========================================================================

separator "ISO-19a. FR*CPO POST CDR missing total_cost — OCPI error"
MISSING_FR=$(cat <<'EOF'
{
  "country_code": "FR",
  "party_id": "CPO",
  "id": "CDR-FR-MISSING-001",
  "start_date_time": "2025-01-01T00:00:00Z",
  "end_date_time":   "2025-01-01T01:00:00Z",
  "cdr_token": {
    "country_code": "FR", "party_id": "MSP",
    "uid": "RFID-MISSING-FR", "type": "RFID", "contract_id": "FR-MSP-MISSING-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-MISSING-FR", "address": "1 Test", "city": "Paris", "country": "FRA",
    "coordinates": { "latitude": "48.860000", "longitude": "2.330000" },
    "evse_uid": "EVSE-MISSING-FR", "evse_id": "FR*CPO*E999", "connector_id": "1",
    "connector_standard": "IEC_62196_T2", "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR", "tariffs": [],
  "charging_periods": [
    { "start_date_time": "2025-01-01T00:00:00Z", "dimensions": [ { "type": "ENERGY", "volume": 5.0 } ] }
  ],
  "total_energy": 5.0, "total_time": 1.0, "last_updated": "2025-01-01T01:05:00Z"
}
EOF
)
body=$(do_post_cdr 200 "__FR_MISSING__" "$MISSING_FR")
assert_ocpi_error "$body" "FR*CPO CDR missing total_cost rejected"

separator "ISO-19b. DE*EVP POST CDR missing total_cost — OCPI error"
MISSING_DE=$(cat <<'EOF'
{
  "country_code": "DE",
  "party_id": "EVP",
  "id": "CDR-DE-MISSING-001",
  "start_date_time": "2025-01-01T00:00:00Z",
  "end_date_time":   "2025-01-01T01:00:00Z",
  "cdr_token": {
    "country_code": "DE", "party_id": "MSP",
    "uid": "RFID-MISSING-DE", "type": "RFID", "contract_id": "DE-MSP-MISSING-001"
  },
  "auth_method": "WHITELIST",
  "cdr_location": {
    "id": "LOC-MISSING-DE", "address": "1 Test", "city": "Berlin", "country": "DEU",
    "coordinates": { "latitude": "52.516000", "longitude": "13.388000" },
    "evse_uid": "EVSE-MISSING-DE", "evse_id": "DE*EVP*E999", "connector_id": "1",
    "connector_standard": "IEC_62196_T2", "connector_format": "SOCKET",
    "connector_power_type": "AC_3_PHASE"
  },
  "currency": "EUR", "tariffs": [],
  "charging_periods": [
    { "start_date_time": "2025-01-01T00:00:00Z", "dimensions": [ { "type": "ENERGY", "volume": 8.0 } ] }
  ],
  "total_energy": 8.0, "total_time": 1.0, "last_updated": "2025-01-01T01:05:00Z"
}
EOF
)
body=$(do_post_cdr 200 "__DE_MISSING__" "$MISSING_DE")
assert_ocpi_error "$body" "DE*EVP CDR missing total_cost rejected"

# ===========================================================================
# Summary
# ===========================================================================

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  RESULTS${RESET}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}PASS: $PASS${RESET}   ${RED}FAIL: $FAIL${RESET}   TOTAL: $((PASS + FAIL))"
echo ""

[ "$FAIL" -gt 0 ] && exit 1 || exit 0