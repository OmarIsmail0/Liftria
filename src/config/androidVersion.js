'use strict';

/**
 * Expo's dynamic config loader can resolve CommonJS JavaScript without requiring
 * TypeScript source resolution. Keep parsing isolated, deterministic and tested.
 * @param {string | undefined} override
 * @param {number} baseline
 * @returns {number}
 */
function resolveAndroidVersionCode(override, baseline) {
  const value = typeof override === 'string' && override.trim() !== '' ? Number(override) : NaN;
  return Number.isSafeInteger(value) && value > baseline ? value : baseline;
}

module.exports = { resolveAndroidVersionCode };
