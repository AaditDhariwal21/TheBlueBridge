import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  generateReferralCode,
  isWellFormedReferralCode,
  normalizeReferralCode,
} from './referralCode.ts';

describe('referral codes', () => {
  it('generates well-formed codes without look-alike characters', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateReferralCode();
      assert.equal(isWellFormedReferralCode(code), true, code);
      assert.doesNotMatch(code, /[01ILO]/);
    }
  });

  it('does not repeat itself', () => {
    const codes = new Set(Array.from({ length: 2000 }, generateReferralCode));
    assert.equal(codes.size, 2000);
  });

  it('normalizes what people type', () => {
    assert.equal(normalizeReferralCode(' abcde-fghjk '), 'ABCDEFGHJK');
    assert.equal(normalizeReferralCode('ab cd'), 'ABCD');
  });

  it('rejects malformed codes', () => {
    for (const bad of ['', 'ABCDEFGHJ', 'ABCDEFGHJKM', 'ABCDEFGHJO', 'abcdefghjk']) {
      assert.equal(isWellFormedReferralCode(bad), false, bad);
    }
  });
});
