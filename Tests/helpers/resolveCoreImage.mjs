// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * citrineos-server's `:latest` tag is a race, not a stable pointer: push-to-ecr.yml (in
 * citrineos-core) pushes `:latest` unconditionally on every push to EITHER env/staging or
 * env/prod, so it reflects whichever branch pushed most recently, not either branch reliably.
 * A migration merged to env/staging can be invisible on `:latest` for days if env/prod happens
 * to push after it.
 *
 * Both branches also push a stable, uniquely-named tag on every push:
 * `staging-<epoch>-<sha>` / `prod-<epoch>-<sha>`. This resolves the newest one for whichever
 * branch this PR/checkout targets, so integration tests track the branch they actually build
 * on instead of whichever branch happened to push most recently.
 */

const OWNER = 'enexflow';
const PACKAGE = 'citrineos-server';

function targetPrefix() {
  const branch =
    process.env.GITHUB_BASE_REF || process.env.GITHUB_REF_NAME || '';
  return /(^|\/)prod$/.test(branch) ? 'prod' : 'staging';
}

export async function resolveCoreImage(fallback) {
  if (process.env.CORE_TEST_IMAGE) {
    return process.env.CORE_TEST_IMAGE;
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.warn(
      `[resolveCoreImage] no GITHUB_TOKEN/GH_TOKEN set, falling back to ${fallback}`,
    );
    return fallback;
  }

  const prefix = targetPrefix();
  try {
    let best;
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(
        `https://api.github.com/orgs/${OWNER}/packages/container/${PACKAGE}/versions?per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );
      if (!res.ok) {
        throw new Error(`GitHub API ${res.status} ${res.statusText}`);
      }
      const batch = await res.json();
      for (const version of batch) {
        for (const tag of version.metadata?.container?.tags ?? []) {
          if (!tag.startsWith(`${prefix}-`)) continue;
          const epoch = Number(tag.split('-')[1]);
          if (!Number.isFinite(epoch)) continue;
          if (!best || epoch > best.epoch) best = { epoch, tag };
        }
      }
      if (batch.length < 100) break;
    }

    if (!best) {
      console.warn(
        `[resolveCoreImage] no ${prefix}-* tag found for ${PACKAGE}, falling back to ${fallback}`,
      );
      return fallback;
    }
    const image = `ghcr.io/${OWNER}/${PACKAGE}:${best.tag}`;
    console.log(`[resolveCoreImage] using ${image} (target: env/${prefix})`);
    return image;
  } catch (err) {
    console.warn(
      `[resolveCoreImage] lookup failed (${err instanceof Error ? err.message : String(err)}), falling back to ${fallback}`,
    );
    return fallback;
  }
}
