import { createHash } from 'crypto';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function sha256HexPrefix(input: string, len = 8): string {
  return sha256Hex(input).slice(0, len);
}
