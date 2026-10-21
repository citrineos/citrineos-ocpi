// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// Runs as `pretest:integration`, so nobody has to remember. Without a local copy,
// testcontainers' own pull happens inside beforeAll — where a credential helper cannot
// prompt (docker credsStore "pass" needs a GPG passphrase), so it fails silently and the
// suite reports `relation "Connectors" does not exist` instead of an auth error.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolveCoreImage } from './resolveCoreImage.mjs';

const images = JSON.parse(
  readFileSync(new URL('./testImages.json', import.meta.url), 'utf-8'),
);
const resolved = { ...images, core: await resolveCoreImage(images.core) };

for (const image of Object.values(resolved)) {
  console.log(`pulling ${image}`);
  execSync(`docker pull ${image}`, { stdio: 'inherit' });
}
