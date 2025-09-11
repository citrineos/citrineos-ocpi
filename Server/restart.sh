# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

echo "[nodemon] Change detected in: $1"

# Check if change is in core
if [[ "$1" == *"citrineos-core"* ]]; then
  echo "[nodemon] Rebuilding citrineos-core..."
  (cd ../../citrineos-core && npm run clean && npm run build)

  echo "[nodemon] Reinstalling citrineos-core into citrineos-ocpi..."
  (cd ../../citrineos-ocpi && npm i)
else
  echo "[nodemon] Change in local files — skipping core rebuild."
fi

# Rebuild & migrate this app
npm run build --prefix ../
npm run migrate --prefix ../

# Start the server
node --inspect=0.0.0.0:9229 ./dist/index.js
