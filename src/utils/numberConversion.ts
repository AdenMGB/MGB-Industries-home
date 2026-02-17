/**
 * Shared utilities for number conversion (decimal, binary, hex, IPv4).
 */

export function decimalToBinary(n: number, bits?: number): string {
  const bin = n.toString(2)
  if (bits !== undefined) {
    return bin.padStart(bits, '0')
  }
  return bin
}

export function binaryToDecimal(bin: string): number | null {
  const trimmed = bin.trim()
  if (!trimmed || !/^[01]+$/.test(trimmed)) return null
  return parseInt(trimmed, 2)
}

export function decimalToHex(n: number, prefix = false): string {
  const hex = n.toString(16).toLowerCase()
  return prefix ? '0x' + hex : hex
}

export function hexToDecimal(hex: string): number | null {
  const trimmed = hex.trim()
  if (!trimmed) return null
  const cleaned = trimmed.toLowerCase().startsWith('0x')
    ? trimmed.slice(2)
    : trimmed
  if (!/^[0-9a-f]+$/i.test(cleaned)) return null
  const num = parseInt(cleaned, 16)
  return isNaN(num) ? null : num
}

/** Convert decimal 0-65535 to 4 hex digits (IPv6 hextet) */
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

export function binaryToIpv4(binary: string): string | null {
  const parts = binary.trim().split('.')
  if (parts.length !== 4) return null
  const octets: number[] = []
  for (const part of parts) {
    if (part.length !== 8 || !/^[01]+$/.test(part)) return null
    const num = parseInt(part, 2)
    if (num < 0 || num > 255) return null
    octets.push(num)
  }
  return octets.join('.')
}

/**
 * Parse a number from decimal, hex (0x), octal (0o), or binary (0b) string.
 */
export function parseNumber(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase().startsWith('0x')) {
    const num = parseInt(trimmed, 16)
    return isNaN(num) ? null : num
  }
  if (trimmed.toLowerCase().startsWith('0o')) {
    const num = parseInt(trimmed.slice(2), 8)
    return isNaN(num) ? null : num
  }
  if (trimmed.toLowerCase().startsWith('0b')) {
    const num = parseInt(trimmed.slice(2), 2)
    return isNaN(num) ? null : num
  }
  const num = parseInt(trimmed, 10)
  if (isNaN(num) || !Number.isInteger(Number(trimmed))) return null
  return num
}
