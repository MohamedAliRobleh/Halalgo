import type { Request, Response } from 'express';
import { esClient } from '../elastic/client.js';
import { INDICES } from '../elastic/indices.js';
import { z } from 'zod';

export const searchQuerySchema = z.object({
  q:         z.string().min(1, 'Search query is required'),
  storeType: z.enum(['restaurant', 'grocery']).optional(),
  lat:       z.coerce.number().optional(),
  lng:       z.coerce.number().optional(),
  radiusKm:  z.coerce.number().default(10),
  openOnly:  z.coerce.boolean().default(false),
  halalOnly: z.coerce.boolean().default(false),
  page:      z.coerce.number().int().min(1).default(1),
  pageSize:  z.coerce.number().int().min(1).max(50).default(20),
});

export async function searchStores(req: Request, res: Response): Promise<void> {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { q, storeType, lat, lng, radiusKm, openOnly, halalOnly, page, pageSize } = parsed.data;

  const must: object[] = [
    { multi_match: { query: q, fields: ['name^3', 'description', 'cuisineType'] } },
  ];
  const filter: object[] = [{ term: { isVerified: true } }];

  if (storeType) filter.push({ term: { storeType } });
  if (openOnly)  filter.push({ term: { isOpen: true } });
  if (halalOnly) filter.push({ term: { isVerified: true } });

  if (lat !== undefined && lng !== undefined) {
    filter.push({ geo_distance: { distance: `${radiusKm}km`, location: { lat, lon: lng } } });
  }

  const response = await esClient.search({
    index: INDICES.STORES,
    from:  (page - 1) * pageSize,
    size:  pageSize,
    query: { bool: { must, filter } },
    sort:  lat !== undefined && lng !== undefined
      ? [{ _geo_distance: { location: { lat, lon: lng }, order: 'asc', unit: 'km' } }]
      : [{ rating: 'desc' }],
  });

  const results = response.hits.hits.map((hit) => ({ ...(hit._source as object | undefined ?? {}), _score: hit._score }));
  const total = typeof response.hits.total === 'number'
    ? response.hits.total
    : (response.hits.total as { value: number } | undefined)?.value ?? 0;

  res.json({ results, total, page, pageSize });
}

export async function searchMenuItems(req: Request, res: Response): Promise<void> {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }

  const { q, storeType, page, pageSize } = parsed.data;
  const filter: object[] = [{ term: { isAvailable: true } }];
  if (storeType) filter.push({ term: { storeType } });

  const response = await esClient.search({
    index: INDICES.MENU_ITEMS,
    from:  (page - 1) * pageSize,
    size:  pageSize,
    query: { bool: { must: [{ multi_match: { query: q, fields: ['name^3', 'description'] } }], filter } },
  });

  const results = response.hits.hits.map((hit) => hit._source);
  const total = typeof response.hits.total === 'number'
    ? response.hits.total
    : (response.hits.total as { value: number } | undefined)?.value ?? 0;

  res.json({ results, total, page, pageSize });
}
