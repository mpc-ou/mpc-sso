import { BadRequestException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';

function ipv4ToLong(ip: string): number {
  return (
    ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
  );
}

/** RFC 1918/5735 private, loopback, link-local, CGNAT, and multicast+ ranges */
function isPrivateIPv4(ip: string): boolean {
  const ranges: [string, number][] = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10], // CGNAT
    ['127.0.0.0', 8],
    ['169.254.0.0', 16], // link-local (cloud metadata endpoints live here)
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['224.0.0.0', 4], // multicast and above
  ];
  const target = ipv4ToLong(ip);
  return ranges.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipv4ToLong(base) & mask) === (target & mask);
  });
}

/** Loopback, link-local, and unique-local (fc00::/7) ranges, plus IPv4-mapped addresses */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.split(':').pop();
    if (mapped && isIPv4(mapped)) return isPrivateIPv4(mapped);
  }
  return false;
}

/**
 * Rejects webhook URLs that resolve to loopback/private/link-local addresses
 * (including cloud metadata endpoints at 169.254.169.254) to prevent SSRF via
 * admin-configured webhook targets. Requires https.
 */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid webhook URL');
  }

  if (url.protocol !== 'https:') {
    throw new BadRequestException('Webhook URL must use https');
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    throw new BadRequestException('Could not resolve webhook URL hostname');
  }

  const unsafe = addresses.some(
    ({ address }) =>
      (isIPv4(address) && isPrivateIPv4(address)) ||
      (isIPv6(address) && isPrivateIPv6(address)),
  );
  if (unsafe) {
    throw new BadRequestException(
      'Webhook URL must not point to a private or internal address',
    );
  }
}
