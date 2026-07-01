// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const tag = process.env.NPM_TAG || 'prod';

const files = execSync(
  'find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.git/*"',
)
  .toString()
  .trim()
  .split('\n');

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  let changed = false;
  for (const section of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
  ] as const) {
    if (!pkg[section]) continue;
    for (const key of Object.keys(pkg[section])) {
      if (key.startsWith('@zetra/')) {
        pkg[section][key] = tag;
        changed = true;
      }
    }
  }
  if (pkg.overrides) {
    for (const key of Object.keys(pkg.overrides)) {
      if (key.startsWith('@zetra/')) {
        pkg.overrides[key] = tag;
        changed = true;
      }
    }
  }
  if (changed) {
    writeFileSync(file, JSON.stringify(pkg, null, 2));
    console.log(`Updated ${file} → @zetra/*: ${tag}`);
  }
}
