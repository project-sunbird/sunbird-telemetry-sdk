import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Utils } from '../src/utils/Utils';

describe('Utils.generateUUID', () => {

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should use crypto.randomUUID if available', () => {
    const mockRandomUUID = vi.fn(() => '123e4567-e89b-12d3-a456-426614174000');
    vi.stubGlobal('crypto', { randomUUID: mockRandomUUID });

    const uuid = Utils.generateUUID();
    expect(uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(mockRandomUUID).toHaveBeenCalled();
  });

  it('should fallback to crypto.getRandomValues if randomUUID is missing', () => {
    const mockGetRandomValues = vi.fn((array: Uint8Array) => {
        // Fill with zeros to test bit manipulation logic deterministically
        for(let i=0; i<array.length; i++) array[i] = 0;
        return array;
    });

    vi.stubGlobal('crypto', {
        randomUUID: undefined,
        getRandomValues: mockGetRandomValues
    });

    const uuid = Utils.generateUUID();

    expect(mockGetRandomValues).toHaveBeenCalled();

    // Verify version 4 and variant 1
    // Version: 4xxx -> 3rd group
    // Variant: 8xxx, 9xxx, axxx, bxxx -> 4th group first char
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Check specific value based on 0 input + version/variant bits
    // buf[6] = 0 -> (0 & 0x0f) | 0x40 = 0x40 -> '40'
    // buf[8] = 0 -> (0 & 0x3f) | 0x80 = 0x80 -> '80'
    expect(uuid).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('should fallback to Math.random if crypto is missing', () => {
    vi.stubGlobal('crypto', undefined);

    const uuid = Utils.generateUUID();
    // Should be valid UUID v4 format
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
