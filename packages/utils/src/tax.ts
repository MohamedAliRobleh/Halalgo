export type CanadianProvince =
  | 'ON' | 'NB' | 'NL' | 'NS' | 'PE'
  | 'AB' | 'BC' | 'QC' | 'SK' | 'MB' | 'NT' | 'NU' | 'YT';

export interface TaxRate {
  gst: number;
  pst: number;
  hst: number | null;
}

const TAX_RATES: Record<CanadianProvince, TaxRate> = {
  ON: { gst: 0,    pst: 0,       hst: 0.13    },
  NB: { gst: 0,    pst: 0,       hst: 0.15    },
  NL: { gst: 0,    pst: 0,       hst: 0.15    },
  NS: { gst: 0,    pst: 0,       hst: 0.15    },
  PE: { gst: 0,    pst: 0,       hst: 0.15    },
  AB: { gst: 0.05, pst: 0,       hst: null    },
  BC: { gst: 0.05, pst: 0.07,    hst: null    },
  QC: { gst: 0.05, pst: 0.09975, hst: null    },
  SK: { gst: 0.05, pst: 0.06,    hst: null    },
  MB: { gst: 0.05, pst: 0.07,    hst: null    },
  NT: { gst: 0.05, pst: 0,       hst: null    },
  NU: { gst: 0.05, pst: 0,       hst: null    },
  YT: { gst: 0.05, pst: 0,       hst: null    },
};

function countDecimals(n: number): number {
  const s = n.toString();
  return s.includes('.') ? (s.split('.')[1]?.length ?? 0) : 0;
}

export function calculateTax(subtotal: number, province: CanadianProvince): number {
  const rates = TAX_RATES[province];
  const rate = rates.hst !== null
    ? rates.hst
    : rates.gst + rates.pst;
  // Determine precision from individual rate components (avoids floating-point
  // artifacts when computing combined rates like 0.05 + 0.07 = 0.12000000000000001)
  let precision: number;
  if (rates.hst !== null) {
    precision = Math.max(2, countDecimals(rates.hst));
  } else {
    precision = Math.max(2, countDecimals(rates.gst), countDecimals(rates.pst));
  }
  const factor = Math.pow(10, precision);
  return Math.round(subtotal * rate * factor) / factor;
}

export function getTaxRate(province: CanadianProvince): number {
  const rates = TAX_RATES[province];
  return rates.hst !== null ? rates.hst : rates.gst + rates.pst;
}
