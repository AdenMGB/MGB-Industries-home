/**
 * Server-side number conversion utilities (ported from client).
 * Used for multiplayer question generation - ensures same logic as client.
 */

export function decimalToBinary(n: number, bits?: number): string {
  const bin = n.toString(2)
  if (bits !== undefined) {
    return bin.padStart(bits, '0')
  }
  return bin
}

export function decimalToHex(n: number, prefix = false): string {
  const hex = n.toString(16).toLowerCase()
  return prefix ? '0x' + hex : hex
}

export function decimalToIpv6Hextet(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 0xffff) return null
  return n.toString(16).toUpperCase().padStart(4, '0')
}

export function ipv4ToBinary(ip: string): string | null {
  const octets = ip.trim().split('.')
  if (octets.length !== 4) return null
  const parts: string[] = []
  for (const octet of octets) {
    const num = parseInt(octet, 10)
    if (isNaN(num) || num < 0 || num > 255) return null
    parts.push(num.toString(2).padStart(8, '0'))
  }
  return parts.join('.')
}
