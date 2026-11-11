import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clientIpKey } from './rateLimits.ts';

function request(ip: string | undefined, headers: Record<string, string> = {}) {
  return { ip, get: (name: string) => headers[name.toLowerCase()] };
}

describe('clientIpKey', () => {
  const fromCloudflare = clientIpKey('cf-connecting-ip');

  it('uses the edge header when configured', () => {
    const req = request('10.0.0.1', { 'cf-connecting-ip': ' 49.43.189.154 ' });
    assert.equal(fromCloudflare(req), '49.43.189.154');
  });

  it('ignores the header when not configured, so clients cannot choose their key', () => {
    const req = request('10.0.0.1', { 'cf-connecting-ip': '49.43.189.154' });
    assert.equal(clientIpKey(null)(req), '10.0.0.1');
  });

  it('falls back to req.ip when the header is missing or not an IP', () => {
    assert.equal(fromCloudflare(request('10.0.0.1')), '10.0.0.1');
    assert.equal(
      fromCloudflare(request('10.0.0.1', { 'cf-connecting-ip': 'nonsense' })),
      '10.0.0.1',
    );
  });

  it('groups IPv6 addresses by /56', () => {
    const a = request(undefined, { 'cf-connecting-ip': '2405:201:5c03:f0f2:98de:5b5:f436:6e3e' });
    const b = request(undefined, { 'cf-connecting-ip': '2405:201:5c03:f0aa::1' });
    assert.equal(fromCloudflare(a), '2405:201:5c03:f000::/56');
    assert.equal(fromCloudflare(a), fromCloudflare(b));
  });
});
