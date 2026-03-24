#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

# Tariffs module OCPI 2.2.1 - test curl commands
#
# Prerequisites:
#   1. Server running on localhost:8085
#
# Usage:
#   chmod +x tariffs-test-curls.sh
#   ./tariffs-test-curls.sh
#
# Or run individual sections by copying the curl commands.

BASE_URL="http://localhost:8085/ocpi/2.2.1/tariffs"

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

separator "1. PUT /tariffs/FR/ZTA/1 — Creer tarif 1 (ENERGY + FLAT)"
run_curl 200 \
  -X PUT "$BASE_URL/FR/ZTA/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1",
    "country_code": "FR",
    "party_id": "ZTA",
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

separator "2. PUT /tariffs/FR/ZTA/2 — Creer tarif 2 (EUR avec tariffAltText)"
run_curl 200 \
  -X PUT "$BASE_URL/FR/ZTA/2" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "2",
    "country_code": "FR",
    "party_id": "ZTA",
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

# ===========================================================================
# PHASE 2 — READ (Receiver GET + Sender GET)
# ===========================================================================

separator "3. GET /tariffs/FR/ZTA/1 — Recuperer tarif 1"
run_curl 200 \
  "$BASE_URL/FR/ZTA/1" \
  "${OCPI_HEADERS[@]}"

separator "4. GET /tariffs/FR/ZTA/2 — Recuperer tarif 2"
run_curl 200 \
  "$BASE_URL/FR/ZTA/2" \
  "${OCPI_HEADERS[@]}"

separator "5. GET /tariffs/FR/ZTA/999 — Tarif inexistant (attend 404)"
run_curl 404 \
  "$BASE_URL/FR/ZTA/999" \
  "${OCPI_HEADERS[@]}"

separator "6. GET /tariffs — Liste paginee (Sender Interface)"
run_curl 200 \
  "$BASE_URL" \
  "${OCPI_HEADERS[@]}"

separator "7. GET /tariffs?limit=1&offset=0 — Pagination (page 1)"
run_curl 200 \
  "$BASE_URL?limit=1&offset=0" \
  "${OCPI_HEADERS[@]}"

separator "8. GET /tariffs?limit=1&offset=1 — Pagination (page 2)"
run_curl 200 \
  "$BASE_URL?limit=1&offset=1" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 3 — UPDATE (Receiver PUT sur tarif existant)
# ===========================================================================

separator "9. PUT /tariffs/FR/ZTA/1 — Mettre a jour tarif 1 (ajout TIME)"
run_curl 200 \
  -X PUT "$BASE_URL/FR/ZTA/1" \
  "${OCPI_HEADERS[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1",
    "country_code": "FR",
    "party_id": "ZTA",
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

separator "10. GET /tariffs/FR/ZTA/1 — Verifier la mise a jour"
run_curl 200 \
  "$BASE_URL/FR/ZTA/1" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 4 — DELETE (Receiver DELETE)
# ===========================================================================

separator "11. DELETE /tariffs/FR/ZTA/2 — Supprimer tarif 2"
run_curl 200 \
  -X DELETE "$BASE_URL/FR/ZTA/2" \
  "${OCPI_HEADERS[@]}"

separator "12. GET /tariffs/FR/ZTA/2 — Verifier suppression (attend 404)"
run_curl 404 \
  "$BASE_URL/FR/ZTA/2" \
  "${OCPI_HEADERS[@]}"

separator "13. DELETE /tariffs/FR/ZTA/999 — Supprimer tarif inexistant (attend erreur)"
run_curl 404 \
  -X DELETE "$BASE_URL/FR/ZTA/999" \
  "${OCPI_HEADERS[@]}"

# ===========================================================================
# PHASE 5 — CLEANUP
# ===========================================================================

separator "14. DELETE /tariffs/FR/ZTA/1 — Nettoyage tarif 1"
run_curl 200 \
  -X DELETE "$BASE_URL/FR/ZTA/1" \
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
