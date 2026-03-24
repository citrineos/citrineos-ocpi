#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Tokens module OCPI 2.2.1 - test curl commands
#
# Prerequisites:
#   1. Server running on localhost:8085
#
# Usage:
#   chmod +x tokens-test-curls.sh
#   ./tokens-test-curls.sh
#
# Or run individual sections by copying the curl commands.

BASE_URL="http://localhost:8085/ocpi/2.2.1/tokens"

AUTH_TOKEN="Token YjU5ZGNlYTctZWM4My00NjQwLTllNTEtZWY0MjA2NDgwMDc0"

# OCPI headers (partner FR/TMS -> tenant FR/ZTA)
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
    echo -e "${RED}  -> Is the server running on $BASE_URL ?${RESET}"
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
# ===========================================================================

separator "1. PUT /tokens/FR/TMS/RFID001 — Creer token RFID (whitelist ALWAYS)"
run_curl 200 \
  -X PUT "$BASE_URL/FR/TMS/RFID001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "TMS",
    "uid": "RFID001",
    "type": "RFID",
    "contract_id": "FRTMS000001",
    "visual_number": "TMS-RFID-001",
    "issuer": "TotalEnergies",
    "group_id": null,
    "valid": true,
    "whitelist": "ALWAYS",
    "language": "fr",
    "last_updated": "2024-07-10T18:00:00.000Z"
  }'

separator "2. PUT /tokens/FR/TMS/APP001 — Creer token APP_USER (whitelist NEVER)"
run_curl 200 \
  -X PUT "$BASE_URL/FR/TMS/APP001?type=APP_USER" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "TMS",
    "uid": "APP001",
    "type": "APP_USER",
    "contract_id": "FRTMS000002",
    "visual_number": "TMS-APP-001",
    "issuer": "TotalEnergies",
    "valid": true,
    "whitelist": "NEVER",
    "language": "en",
    "last_updated": "2024-07-10T19:00:00.000Z"
  }'

separator "3. PUT /tokens/FR/TMS/ADHOC001 — Creer token AD_HOC_USER (whitelist NEVER)"
run_curl 200 \
  -X PUT "$BASE_URL/FR/TMS/ADHOC001?type=AD_HOC_USER" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "TMS",
    "uid": "ADHOC001",
    "type": "AD_HOC_USER",
    "contract_id": "FRTMS000003",
    "visual_number": "TMS-ADHOC-001",
    "issuer": "TotalEnergies",
    "valid": true,
    "whitelist": "NEVER",
    "last_updated": "2024-07-10T20:00:00.000Z"
  }'

# ===========================================================================
# PHASE 2 — READ (Receiver GET)
# ===========================================================================

separator "4. GET /tokens/FR/TMS/RFID001 — Recuperer token RFID"
run_curl 200 \
  "$BASE_URL/FR/TMS/RFID001" \
  "${OCPI_HEADERS[@]}"

separator "5. GET /tokens/FR/TMS/APP001?type=APP_USER — Recuperer token APP_USER"
run_curl 200 \
  "$BASE_URL/FR/TMS/APP001?type=APP_USER" \
  "${OCPI_HEADERS[@]}"

separator "6. GET /tokens/FR/TMS/UNKNOWN — Token inexistant (attend 404)"
run_curl 404 \
  "$BASE_URL/FR/TMS/UNKNOWN" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 3 — LIST (Sender GET pagine)
# ===========================================================================

separator "7. GET /tokens — Liste paginee (Sender Interface)"
run_curl 200 \
  "$BASE_URL" \
  "${OCPI_HEADERS[@]}"

separator "8. GET /tokens?limit=1&offset=0 — Pagination (page 1)"
run_curl 200 \
  "$BASE_URL?limit=1&offset=0" \
  "${OCPI_HEADERS[@]}"

separator "9. GET /tokens?limit=1&offset=1 — Pagination (page 2)"
run_curl 200 \
  "$BASE_URL?limit=1&offset=1" \
  "${OCPI_HEADERS[@]}"

separator "10. GET /tokens?date_from=2024-07-10T19:00:00Z — Filtre date_from"
run_curl 200 \
  "$BASE_URL?date_from=2024-07-10T19:00:00Z" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 4 — UPDATE (Receiver PUT + PATCH)
# ===========================================================================

separator "11. PUT /tokens/FR/TMS/RFID001 — Mettre a jour token RFID (ajout energy_contract)"
run_curl 200 \
  -X PUT "$BASE_URL/FR/TMS/RFID001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "country_code": "FR",
    "party_id": "TMS",
    "uid": "RFID001",
    "type": "RFID",
    "contract_id": "FRTMS000001",
    "visual_number": "TMS-RFID-001",
    "issuer": "TotalEnergies",
    "valid": true,
    "whitelist": "ALLOWED",
    "language": "fr",
    "energy_contract": {
      "supplier_name": "EDF",
      "contract_id": "EDF-12345"
    },
    "last_updated": "2024-08-01T10:00:00.000Z"
  }'

separator "12. PATCH /tokens/FR/TMS/RFID001 — Invalider le token RFID"
run_curl 200 \
  -X PATCH "$BASE_URL/FR/TMS/RFID001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "valid": false,
    "last_updated": "2024-08-15T12:00:00.000Z"
  }'

separator "13. GET /tokens/FR/TMS/RFID001 — Verifier invalidation"
run_curl 200 \
  "$BASE_URL/FR/TMS/RFID001" \
  "${OCPI_HEADERS[@]}"

separator "14. PATCH /tokens/FR/TMS/UNKNOWN — Patch token inexistant (attend erreur)"
run_curl 404 \
  -X PATCH "$BASE_URL/FR/TMS/UNKNOWN" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "valid": false,
    "last_updated": "2024-08-15T12:00:00.000Z"
  }'

# ===========================================================================
# PHASE 5 — AUTHORIZE (Sender POST authorize)
# ===========================================================================

separator "15. POST /tokens/RFID001/authorize — Autorisation temps reel (sans body)"
run_curl 200 \
  -X POST "$BASE_URL/RFID001/authorize" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json"

separator "16. POST /tokens/APP001/authorize?type=APP_USER — Autorisation avec type"
run_curl 200 \
  -X POST "$BASE_URL/APP001/authorize?type=APP_USER" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json"

separator "17. POST /tokens/RFID001/authorize — Autorisation avec LocationReferences"
run_curl 200 \
  -X POST "$BASE_URL/RFID001/authorize" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "LOC001",
    "evse_uids": ["EVSE001", "EVSE002"]
  }'

separator "18. POST /tokens/UNKNOWN/authorize — Token inconnu (attend 404)"
run_curl 404 \
  -X POST "$BASE_URL/UNKNOWN/authorize" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json"

# ===========================================================================
# PHASE 6 — CLEANUP (revalidation des tokens de test)
# ===========================================================================

separator "19. PATCH /tokens/FR/TMS/RFID001 — Revalider token RFID pour nettoyage"
run_curl 200 \
  -X PATCH "$BASE_URL/FR/TMS/RFID001" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "valid": true,
    "last_updated": "2024-09-01T00:00:00.000Z"
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
