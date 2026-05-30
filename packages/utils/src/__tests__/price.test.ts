import { describe, it, expect } from 'vitest';
import { formatCAD, centsToCAD, cadToCents } from '../price.js';

describe('formatCAD', () => {
  it('formats whole dollar amounts', () => {
    expect(formatCAD(10)).toBe('$10.00');
  });

  it('formats amounts with cents', () => {
    expect(formatCAD(10.5)).toBe('$10.50');
  });

  it('formats zero', () => {
    expect(formatCAD(0)).toBe('$0.00');
  });

  it('formats large amounts with comma separators', () => {
    expect(formatCAD(1234.56)).toBe('$1,234.56');
  });
});

describe('centsToCAD', () => {
  it('converts cents to dollar float', () => {
    expect(centsToCAD(1099)).toBe(10.99);
  });

  it('converts zero cents', () => {
    expect(centsToCAD(0)).toBe(0);
  });
});

describe('cadToCents', () => {
  it('converts dollar float to cents integer', () => {
    expect(cadToCents(10.99)).toBe(1099);
  });

  it('rounds to nearest cent', () => {
    expect(cadToCents(10.999)).toBe(1100);
  });
});
