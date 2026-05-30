import { describe, it, expect } from 'vitest';
import { calculateTax } from '../tax.js';

describe('calculateTax', () => {
  it('applies HST 13% in Ontario', () => {
    expect(calculateTax(100, 'ON')).toBe(13);
  });

  it('applies HST 15% in Nova Scotia', () => {
    expect(calculateTax(100, 'NS')).toBe(15);
  });

  it('applies HST 15% in New Brunswick', () => {
    expect(calculateTax(100, 'NB')).toBe(15);
  });

  it('applies HST 15% in Newfoundland', () => {
    expect(calculateTax(100, 'NL')).toBe(15);
  });

  it('applies HST 15% in PEI', () => {
    expect(calculateTax(100, 'PE')).toBe(15);
  });

  it('applies GST 5% in Alberta', () => {
    expect(calculateTax(100, 'AB')).toBe(5);
  });

  it('applies GST+PST 12% in British Columbia', () => {
    expect(calculateTax(100, 'BC')).toBe(12);
  });

  it('applies GST+QST 14.975% in Quebec', () => {
    expect(calculateTax(100, 'QC')).toBeCloseTo(14.975, 2);
  });

  it('applies GST+PST 11% in Saskatchewan', () => {
    expect(calculateTax(100, 'SK')).toBe(11);
  });

  it('applies GST+PST 12% in Manitoba', () => {
    expect(calculateTax(100, 'MB')).toBe(12);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateTax(33.33, 'ON')).toBe(4.33);
  });
});
